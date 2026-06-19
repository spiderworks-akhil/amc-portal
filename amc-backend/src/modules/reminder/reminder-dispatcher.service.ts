import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely, sql } from 'kysely';
import { DB } from '../../db/types.generated';
import { ReminderRulesService } from './reminder-rules/reminder-rules.service';
import { ReminderEmailService } from './reminder-email.service';

interface ExpiringEntity {
  id: string;
  label: string;
  expiryDate: Date;
  targetType: 'domain' | 'ssl' | 'contract' | 'server';
}

@Injectable()
export class ReminderDispatcherService {
  private readonly logger = new Logger(ReminderDispatcherService.name);

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
    private readonly rulesService: ReminderRulesService,
    private readonly emailService: ReminderEmailService,
  ) {}

  @Cron('0 */6 * * *')
  async processReminders() {
    this.logger.log('Reminder dispatcher: starting cycle');

    const created = await this.createPendingReminders();
    const sent = await this.sendDueReminders();

    this.logger.log(
      `Reminder dispatcher: cycle complete — ${created} created, ${sent} sent`,
    );
  }

  private async createPendingReminders(): Promise<number> {
    let totalCreated = 0;
    const eventTypes = [
      'domain_expiry',
      'ssl_expiry',
      'contract_expiry',
      'server_expiry',
    ] as const;

    for (const eventType of eventTypes) {
      const { data: rules } =
        await this.rulesService.findActiveByEventType(eventType);

      for (const rule of rules) {
        const triggerDays = JSON.parse(rule.trigger_days as string) as number[];

        for (const days of triggerDays) {
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + days);

          const entities = await this.findEntities(eventType, targetDate);

          for (const entity of entities) {
            const triggerDate = new Date(entity.expiryDate);
            triggerDate.setDate(triggerDate.getDate() - days);

            const existing = await this.db
              .selectFrom('reminders')
              .select('id')
              .where('target_type', '=', entity.targetType)
              .where('target_id', '=', entity.id)
              .where('rule_id', '=', rule.id)
              .where(
                sql`DATE(trigger_date)`,
                '=',
                sql`DATE(${triggerDate.toISOString()})`,
              )
              .executeTakeFirst();

            if (existing) continue;

            const channel =
              (JSON.parse(rule.channels as string) as string[])[0] ?? 'email';

            await this.db
              .insertInto('reminders')
              .values({
                rule_id: rule.id,
                title: `${entity.label} expires in ${days} days`,
                message: `Reminder: ${entity.label} is expiring on ${entity.expiryDate.toISOString().split('T')[0]}.`,
                target_type: entity.targetType,
                target_id: entity.id,
                trigger_date: triggerDate,
                channel,
                status: 'pending',
              })
              .execute();

            totalCreated++;
          }
        }
      }
    }

    return totalCreated;
  }

  private async sendDueReminders(): Promise<number> {
    const now = new Date();

    const due = await this.db
      .selectFrom('reminders')
      .selectAll()
      .where('status', '=', 'pending')
      .where('trigger_date', '<=', now)
      .execute();

    let sent = 0;

    for (const reminder of due) {
      const recipients = await this.resolveRecipients(reminder);

      if (recipients.length === 0) {
        this.logger.warn(
          `No recipients for reminder ${reminder.id} (${reminder.title}), marking as sent`,
        );
        await this.markSent(reminder.id, []);
        sent++;
        continue;
      }

      const result = await this.emailService.send({
        to: recipients,
        subject: `[Reminder] ${reminder.title}`,
        text: reminder.message ?? undefined,
      });

      if (result.success) {
        await this.markSent(reminder.id, recipients, result.providerMessageId);
      } else {
        await this.db
          .updateTable('reminders')
          .set({ status: 'pending' })
          .where('id', '=', reminder.id)
          .execute();
      }

      sent++;
    }

    return sent;
  }

  private async markSent(
    reminderId: string,
    recipients: string[],
    providerMessageId?: string,
  ) {
    await this.db
      .updateTable('reminders')
      .set({
        status: 'sent',
        sent_at: new Date(),
      })
      .where('id', '=', reminderId)
      .execute();

    for (const recipient of recipients) {
      await this.db
        .insertInto('notification_history')
        .values({
          reminder_id: reminderId,
          recipient,
          channel: 'email',
          status: providerMessageId ? 'sent' : 'failed',
          provider_message_id: providerMessageId ?? null,
          sent_at: new Date(),
        })
        .execute();
    }
  }

  private async findEntities(
    eventType: string,
    targetDate: Date,
  ): Promise<ExpiringEntity[]> {
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    switch (eventType) {
      case 'domain_expiry': {
        const rows = await this.db
          .selectFrom('domains')
          .innerJoin('assets', 'assets.id', 'domains.asset_id')
          .select([
            'domains.id',
            'domains.fqdn',
            'domains.expiry_date',
            'assets.name as asset_name',
          ])
          .where('domains.expiry_date', 'is not', null)
          .where('domains.expiry_date', '>=', start)
          .where('domains.expiry_date', '<=', end)
          .execute();

        return rows.map((r) => ({
          id: r.id,
          label: `Domain ${r.fqdn}${r.asset_name ? ` (${r.asset_name})` : ''}`,
          expiryDate: r.expiry_date!,
          targetType: 'domain' as const,
        }));
      }

      case 'ssl_expiry': {
        const rows = await this.db
          .selectFrom('ssl_certificates')
          .leftJoin('domains', 'domains.id', 'ssl_certificates.domain_id')
          .leftJoin('assets', 'assets.id', 'ssl_certificates.asset_id')
          .select([
            'ssl_certificates.id',
            'ssl_certificates.common_name',
            'ssl_certificates.valid_to',
            'domains.fqdn as domain_fqdn',
            'assets.name as asset_name',
          ])
          .where('ssl_certificates.valid_to', 'is not', null)
          .where('ssl_certificates.valid_to', '>=', start)
          .where('ssl_certificates.valid_to', '<=', end)
          .execute();

        return rows.map((r) => ({
          id: r.id,
          label: `SSL ${r.common_name ?? r.domain_fqdn ?? 'Unknown'}${r.asset_name ? ` (${r.asset_name})` : ''}`,
          expiryDate: r.valid_to!,
          targetType: 'ssl' as const,
        }));
      }

      case 'contract_expiry': {
        const rows = await this.db
          .selectFrom('contracts')
          .innerJoin('clients', 'clients.id', 'contracts.client_id')
          .select([
            'contracts.id',
            'contracts.end_date',
            'clients.name as client_name',
          ])
          .where('contracts.deleted_at', 'is', null)
          .where('contracts.status', '!=', 'expired')
          .where('contracts.end_date', '>=', start)
          .where('contracts.end_date', '<=', end)
          .execute();

        return rows.map((r) => ({
          id: r.id,
          label: `Contract #${r.id.slice(0, 8)}${r.client_name ? ` (${r.client_name})` : ''}`,
          expiryDate: r.end_date,
          targetType: 'contract' as const,
        }));
      }

      case 'server_expiry': {
        const rows = await this.db
          .selectFrom('servers')
          .leftJoin(
            'service_providers',
            'service_providers.id',
            'servers.provider_id',
          )
          .select([
            'servers.id',
            'servers.label',
            'servers.renewal_date',
            'service_providers.name as provider_name',
          ])
          .where('servers.renewal_date', 'is not', null)
          .where('servers.renewal_date', '>=', start)
          .where('servers.renewal_date', '<=', end)
          .execute();

        return rows.map((r) => ({
          id: r.id,
          label: `Server ${r.label}${r.provider_name ? ` (${r.provider_name})` : ''}`,
          expiryDate: r.renewal_date!,
          targetType: 'server' as const,
        }));
      }

      default:
        return [];
    }
  }

  private async resolveRecipients(reminder: {
    target_type: string;
    target_id: string;
    rule_id: string | null;
  }): Promise<string[]> {
    if (reminder.rule_id) {
      const rule = await this.rulesService.findOne(reminder.rule_id);
      const recipients = rule.recipients as
        | { email: string }[]
        | string[]
        | null;

      if (recipients && recipients.length > 0) {
        if (typeof recipients[0] === 'string') {
          return recipients as string[];
        }
        return (recipients as { email: string }[]).map((r) => r.email);
      }
    }

    const contacts = await this.findEntityContacts(
      reminder.target_type,
      reminder.target_id,
    );
    if (contacts.length > 0) return contacts;

    return [];
  }

  private async findEntityContacts(
    targetType: string,
    targetId: string,
  ): Promise<string[]> {
    let clientId: string | null = null;

    switch (targetType) {
      case 'domain': {
        const row = await this.db
          .selectFrom('domains')
          .innerJoin('assets', 'assets.id', 'domains.asset_id')
          .select('assets.client_id')
          .where('domains.id', '=', targetId)
          .executeTakeFirst();
        clientId = row?.client_id ?? null;
        break;
      }
      case 'ssl': {
        const row = await this.db
          .selectFrom('ssl_certificates')
          .innerJoin('domains', 'domains.id', 'ssl_certificates.domain_id')
          .innerJoin('assets', 'assets.id', 'domains.asset_id')
          .select('assets.client_id')
          .where('ssl_certificates.id', '=', targetId)
          .executeTakeFirst();
        clientId = row?.client_id ?? null;
        break;
      }
      case 'contract': {
        const row = await this.db
          .selectFrom('contracts')
          .select('client_id')
          .where('contracts.id', '=', targetId)
          .executeTakeFirst();
        clientId = row?.client_id ?? null;
        break;
      }
      case 'server': {
        break;
      }
    }

    if (!clientId) return [];

    const contacts = await this.db
      .selectFrom('client_contacts')
      .select(['email', 'should_send_notification'])
      .where('client_id', '=', clientId)
      .where('email', 'is not', null)
      .execute();

    return contacts
      .filter((c) => c.should_send_notification && c.email)
      .map((c) => c.email!);
  }
}
