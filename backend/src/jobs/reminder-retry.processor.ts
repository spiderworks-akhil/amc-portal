import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely } from 'kysely';
import { DB } from '../db/types.generated';
import { EmailService } from '../modules/email/email.service';
import { ReminderRulesService } from '../modules/reminder/reminder-rules/reminder-rules.service';
import { buildReminderHtml } from '../modules/email/email-templates';

const COOLDOWN_MINUTES = 15;
const MAX_RETRIES = 3;

@Processor('reminder-retry', {
  concurrency: 3,
})
export class ReminderRetryProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderRetryProcessor.name);

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
    private readonly emailService: EmailService,
    private readonly rulesService: ReminderRulesService,
  ) {
    super();
  }

  async process(job: Job<unknown>): Promise<{ retried: number; escalated: number }> {
    this.logger.log('Reminder retry job: starting');
    const result = await this.retryFailedReminders();
    this.logger.log(
      `Reminder retry job: complete — ${result.retried} retried, ${result.escalated} escalated`,
    );
    return result;
  }

  private async retryFailedReminders(): Promise<{ retried: number; escalated: number }> {
    // Find reminders that have failed
    const failed = await this.db
      .selectFrom('reminders')
      .selectAll()
      .where('status', '=', 'pending')
      .where('failure_reason', 'is not', null)
      .execute();

    if (failed.length === 0) {
      return { retried: 0, escalated: 0 };
    }

    let retried = 0;
    let escalated = 0;

    for (const reminder of failed) {
      try {
        // Check cooldown: get the latest failed_at from notification_history
        const latestFailure = await this.db
          .selectFrom('notification_history')
          .select('failed_at')
          .where('reminder_id', '=', reminder.id)
          .where('status', '=', 'failed')
          .orderBy('failed_at', 'desc')
          .limit(1)
          .executeTakeFirst();

        const lastFailedAt = latestFailure?.failed_at;
        if (lastFailedAt) {
          const cooldownEnd = new Date(lastFailedAt.getTime() + COOLDOWN_MINUTES * 60 * 1000);
          if (new Date() < cooldownEnd) {
            // Still within cooldown — skip
            continue;
          }
        }

        // Count how many times this reminder has been attempted
        const { count } = await this.db
          .selectFrom('notification_history')
          .select(this.db.fn.countAll<number>().as('count'))
          .where('reminder_id', '=', reminder.id)
          .where('status', '=', 'failed')
          .executeTakeFirstOrThrow();

        const attemptCount = Number(count);

        if (attemptCount >= MAX_RETRIES) {
          this.logger.warn(
            `Reminder ${reminder.id} (${reminder.title}) has failed ${attemptCount} times — escalating`,
          );

          await this.db
            .updateTable('reminders')
            .set({
              failure_reason: `Permanently failed after ${attemptCount} attempts. Last error: ${reminder.failure_reason}`.slice(0, 255),
            })
            .where('id', '=', reminder.id)
            .execute();

          escalated++;
          continue;
        }

        // Re-resolve recipients (handles both rule-based and entity contacts)
        const recipients = await this.resolveRecipients(reminder);

        if (recipients.length === 0) {
          this.logger.warn(
            `No recipients for reminder ${reminder.id} (${reminder.title}) on retry — skipping`,
          );
          continue;
        }

        // Look up entity expiry info
        const entityInfo = await this.lookupEntityExpiry(
          reminder.target_type,
          reminder.target_id,
        );

        if (!entityInfo) {
          this.logger.warn(
            `Entity ${reminder.target_type}/${reminder.target_id} not found for reminder ${reminder.id} on retry — skipping`,
          );
          continue;
        }

        const daysRemaining = Math.max(
          1,
          Math.ceil((entityInfo.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        );
        const targetLabel = entityInfo.label;
        const expiryDateStr = entityInfo.expiryDate.toISOString().split('T')[0];

        const emailHtml = buildReminderHtml({
          title: reminder.title,
          message: reminder.message ?? 'Reminder notification.',
          targetLabel,
          targetType: reminder.target_type,
          expiryDate: expiryDateStr,
          daysRemaining,
          portalUrl: `${process.env.PORTAL_URL || 'http://localhost:3000'}/${reminder.target_type}s/${reminder.target_id}`,
        });

        const result = await this.emailService.send({
          to: recipients,
          subject: `[Reminder] ${reminder.title} (retry ${attemptCount + 1})`,
          text: reminder.message ?? undefined,
          html: emailHtml,
        });

        if (result.success) {
          await this.markSent(reminder.id, recipients, result.providerMessageId);
          retried++;
        } else {
          const errMsg = result.error ?? 'Unknown email send error';
          this.logger.warn(
            `Retry failed for reminder ${reminder.id} (attempt ${attemptCount + 1}): ${errMsg}`,
          );

          await this.logRetryFailure(reminder.id, recipients, errMsg);

          // If this was the last allowed retry, escalate permanently
          if (attemptCount + 1 >= MAX_RETRIES) {
            await this.db
              .updateTable('reminders')
              .set({
                failure_reason: `Permanently failed after ${attemptCount + 1} attempts. Last error: ${errMsg}`.slice(0, 255),
              })
              .where('id', '=', reminder.id)
              .execute();
            escalated++;
          }
        }
      } catch (err) {
        this.logger.error(
          `Unexpected error retrying reminder ${reminder.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    return { retried, escalated };
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
        failure_reason: null,
      })
      .where('id', '=', reminderId)
      .executeTakeFirst();

    for (const recipient of recipients) {
      await this.db
        .insertInto('notification_history')
        .values({
          reminder_id: reminderId,
          recipient,
          channel: 'email',
          status: providerMessageId ? 'sent' : 'failed',
          provider_message_id: providerMessageId ?? null,
          failure_reason: null,
          sent_at: new Date(),
        })
        .execute();
    }
  }

  private async logRetryFailure(
    reminderId: string,
    recipients: string[],
    errorMessage: string,
  ) {
    for (const recipient of recipients) {
      await this.db
        .insertInto('notification_history')
        .values({
          reminder_id: reminderId,
          recipient,
          channel: 'email',
          status: 'failed',
          failure_reason: errorMessage.slice(0, 500),
          sent_at: new Date(),
          failed_at: new Date(),
        })
        .execute();
    }

    // Update the reminder's failure_reason
    await this.db
      .updateTable('reminders')
      .set({ failure_reason: errorMessage.slice(0, 255) })
      .where('id', '=', reminderId)
      .execute();
  }

  private async resolveRecipients(reminder: {
    target_type: string;
    target_id: string;
    rule_id: string | null;
  }): Promise<string[]> {
    // Check if the reminder was created from a rule (has rule-level recipients)
    if (reminder.rule_id) {
      try {
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
      } catch {
        // Rule not found or error — fall through to entity contacts
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

    const contactEmails = contacts
      .filter((c) => c.should_send_notification && c.email)
      .map((c) => c.email!);

    const managers = await this.db
      .selectFrom('client_account_managers')
      .innerJoin('users', 'users.id', 'client_account_managers.manager_id')
      .select('users.email')
      .where('client_account_managers.client_id', '=', clientId)
      .where('client_account_managers.deleted_at', 'is', null)
      .where('users.email', 'is not', null)
      .where('users.is_active', '=', true)
      .execute();

    const managerEmails = managers
      .filter((m) => m.email)
      .map((m) => m.email!);

    return [...new Set([...contactEmails, ...managerEmails])];
  }

  private async lookupEntityExpiry(
    targetType: string,
    targetId: string,
  ): Promise<{ expiryDate: Date; label: string } | null> {
    switch (targetType) {
      case 'domain': {
        const row = await this.db
          .selectFrom('domains')
          .innerJoin('assets', 'assets.id', 'domains.asset_id')
          .select([
            'domains.expiry_date',
            'domains.fqdn',
            'assets.name as asset_name',
          ])
          .where('domains.id', '=', targetId)
          .executeTakeFirst();
        if (!row?.expiry_date) return null;
        return {
          expiryDate: row.expiry_date,
          label: `Domain ${row.fqdn}${row.asset_name ? ` (${row.asset_name})` : ''}`,
        };
      }
      case 'ssl': {
        const row = await this.db
          .selectFrom('ssl_certificates')
          .leftJoin('domains', 'domains.id', 'ssl_certificates.domain_id')
          .leftJoin('assets', 'assets.id', 'ssl_certificates.asset_id')
          .select([
            'ssl_certificates.valid_to',
            'ssl_certificates.common_name',
            'domains.fqdn as domain_fqdn',
            'assets.name as asset_name',
          ])
          .where('ssl_certificates.id', '=', targetId)
          .executeTakeFirst();
        if (!row?.valid_to) return null;
        return {
          expiryDate: row.valid_to,
          label: `SSL ${row.common_name ?? row.domain_fqdn ?? 'Unknown'}${row.asset_name ? ` (${row.asset_name})` : ''}`,
        };
      }
      case 'contract': {
        const row = await this.db
          .selectFrom('contracts')
          .innerJoin('clients', 'clients.id', 'contracts.client_id')
          .select([
            'contracts.end_date',
            'clients.name as client_name',
          ])
          .where('contracts.id', '=', targetId)
          .executeTakeFirst();
        if (!row || !row.end_date) return null;
        return {
          expiryDate: row.end_date,
          label: `Contract #${targetId.slice(0, 8)}${row.client_name ? ` (${row.client_name})` : ''}`,
        };
      }
      case 'server': {
        const row = await this.db
          .selectFrom('servers')
          .leftJoin('service_providers', 'service_providers.id', 'servers.provider_id')
          .select([
            'servers.renewal_date',
            'servers.label',
            'service_providers.name as provider_name',
          ])
          .where('servers.id', '=', targetId)
          .executeTakeFirst();
        if (!row?.renewal_date) return null;
        return {
          expiryDate: row.renewal_date,
          label: `Server ${row.label}${row.provider_name ? ` (${row.provider_name})` : ''}`,
        };
      }
      default:
        return null;
    }
  }
}
