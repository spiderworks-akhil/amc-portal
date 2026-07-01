import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely } from 'kysely';
import { DB } from '../db/types.generated';
import { EmailService } from '../modules/email/email.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { buildReminderHtml } from '../modules/email/email-templates';
import { ReminderRulesService } from '../modules/reminder/reminder-rules/reminder-rules.service';
import { WhatsappService } from '../modules/whatsapp/whatsapp.service';

function formatDateDDMMYYYY(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

@Processor('reminder-sending', {
  concurrency: 3,
})
export class ReminderSendingProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderSendingProcessor.name);

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly rulesService: ReminderRulesService,
    private readonly whatsappService: WhatsappService,
  ) {
    super();
  }

  async process(job: Job<unknown>): Promise<{ sent: number }> {
    this.logger.log(`Reminder sending job: starting (attempt ${job.attemptsMade + 1})`);
    const sent = await this.sendDueReminders(job);
    this.logger.log(`Reminder sending job: complete — ${sent} reminders sent`);
    return { sent };
  }

  private async sendDueReminders(job: Job<unknown>): Promise<number> {
    const jobAttempt = job.attemptsMade;
    const now = new Date();

    const due = await this.db
      .selectFrom('reminders')
      .selectAll()
      .where('status', '=', 'pending')
      .where('failure_reason', 'is', null)
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

      // Look up the actual entity expiry date to compute accurate days remaining
      const entityInfo = await this.lookupEntityExpiry(
        reminder.target_type,
        reminder.target_id,
      );

      if (!entityInfo) {
        this.logger.warn(
          `Entity ${reminder.target_type}/${reminder.target_id} not found for reminder ${reminder.id}, marking as sent`,
        );
        await this.markSent(reminder.id, []);
        sent++;
        continue;
      }

      const daysRemaining = Math.max(1, Math.ceil((entityInfo.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
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
        subject: `[Reminder] ${reminder.title}`,
        text: reminder.message ?? undefined,
        html: emailHtml,
      });

      if (result.success) {
        await this.markSent(reminder.id, recipients, result.providerMessageId);

        // Push in-app notification to account managers
        await this.notifyManagersForReminder(reminder);

        // Fire-and-forget WhatsApp expiry notification
        this.sendWhatsAppExpiryReminder(reminder, entityInfo, daysRemaining, formatDateDDMMYYYY(entityInfo.expiryDate))
          .catch(async (err) => {
            const errMsg = err instanceof Error ? err.message : String(err);
            this.logger.error(
              `WhatsApp expiry notification failed for ${reminder.target_type}/${reminder.target_id}: ${errMsg}`,
            );

            // Log failure to notification_history for the reminder
            if (reminder.id) {
              try {
                const whatsappRecipients = await this.resolveWhatsAppRecipients(reminder);
                for (const recipient of whatsappRecipients) {
                  await this.db
                    .insertInto('notification_history')
                    .values({
                      reminder_id: reminder.id,
                      recipient,
                      channel: 'whatsapp',
                      status: 'failed',
                      failure_reason: errMsg.slice(0, 500),
                      sent_at: new Date(),
                      failed_at: new Date(),
                    })
                    .execute();
                }
              } catch (logErr) {
                this.logger.error(`Failed to log WhatsApp failure history: ${logErr}`);
              }
            }
          });
      } else {
        const errMsg = result.error ?? 'Unknown email send error';
        this.logger.warn(
          `Email send failed for reminder ${reminder.id}, will retry (attempt ${jobAttempt + 1}): ${errMsg}`,
        );

        // Log failure to notification_history before throwing
        try {
          for (const recipient of recipients) {
            await this.db
              .insertInto('notification_history')
              .values({
                reminder_id: reminder.id,
                recipient,
                channel: 'email',
                status: 'failed',
                failure_reason: errMsg.slice(0, 500),
                sent_at: new Date(),
                failed_at: new Date(),
              })
              .execute();
          }

          // Also update reminder's failure_reason
          await this.db
            .updateTable('reminders')
            .set({ failure_reason: errMsg.slice(0, 255) })
            .where('id', '=', reminder.id)
            .execute();
        } catch (logErr) {
          this.logger.error(`Failed to log email failure history: ${logErr}`);
        }

        // Throw so BullMQ retries with backoff. Keep status as 'pending'.
        throw new Error(`Email send failed for reminder ${reminder.id}: ${errMsg}`);
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

  private async notifyManagersForReminder(reminder: {
    title: string;
    message: string | null;
    target_type: string;
    target_id: string;
  }) {
    let clientId: string | null = null;

    switch (reminder.target_type) {
      case 'domain': {
        const row = await this.db
          .selectFrom('domains')
          .innerJoin('assets', 'assets.id', 'domains.asset_id')
          .select('assets.client_id')
          .where('domains.id', '=', reminder.target_id)
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
          .where('ssl_certificates.id', '=', reminder.target_id)
          .executeTakeFirst();
        clientId = row?.client_id ?? null;
        break;
      }
      case 'contract': {
        const row = await this.db
          .selectFrom('contracts')
          .select('client_id')
          .where('contracts.id', '=', reminder.target_id)
          .executeTakeFirst();
        clientId = row?.client_id ?? null;
        break;
      }
    }

    if (!clientId) return;

    await this.notificationsService.notifyClientManagers(clientId, {
      type: reminder.target_type,
      title: reminder.title,
      message: reminder.message ?? undefined,
      link: `/${reminder.target_type}s/${reminder.target_id}`,
      severity: 'warning',
    });
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

  /**
   * Send WhatsApp expiry reminder for the given entity via the WhatsApp service.
   */
  private async sendWhatsAppExpiryReminder(
    reminder: { id: string; target_type: string; target_id: string },
    entityInfo: { expiryDate: Date; label: string },
    daysRemaining: number,
    expiryDateStr: string,
  ): Promise<void> {
    switch (reminder.target_type) {
      case 'domain':
        await this.whatsappService.sendDomainExpiryReminder(
          reminder.target_id,
          entityInfo.label,
          daysRemaining,
          expiryDateStr,
          reminder.id,
        );
        break;
      case 'ssl':
        await this.whatsappService.sendSslExpiryReminder(
          reminder.target_id,
          entityInfo.label,
          daysRemaining,
          expiryDateStr,
          reminder.id,
        );
        break;
      case 'server':
        await this.whatsappService.sendServerExpiryReminder(
          reminder.target_id,
          entityInfo.label,
          daysRemaining,
          expiryDateStr,
          reminder.id,
        );
        break;
      case 'contract':
        await this.whatsappService.sendContractExpiryReminder(
          reminder.target_id,
          entityInfo.label,
          daysRemaining,
          expiryDateStr,
          reminder.id,
        );
        break;
    }
  }

  /**
   * Resolve WhatsApp-capable phone numbers for a given reminder's target entity.
   */
  private async resolveWhatsAppRecipients(reminder: {
    target_type: string;
    target_id: string;
  }): Promise<string[]> {
    let clientId: string | null = null;

    switch (reminder.target_type) {
      case 'domain': {
        const row = await this.db
          .selectFrom('domains')
          .innerJoin('assets', 'assets.id', 'domains.asset_id')
          .select('assets.client_id')
          .where('domains.id', '=', reminder.target_id)
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
          .where('ssl_certificates.id', '=', reminder.target_id)
          .executeTakeFirst();
        clientId = row?.client_id ?? null;
        break;
      }
      case 'contract': {
        const row = await this.db
          .selectFrom('contracts')
          .select('client_id')
          .where('contracts.id', '=', reminder.target_id)
          .executeTakeFirst();
        clientId = row?.client_id ?? null;
        break;
      }
      case 'server': {
        const assetLink = await this.db
          .selectFrom('asset_servers')
          .innerJoin('assets', 'assets.id', 'asset_servers.asset_id')
          .select('assets.client_id')
          .where('asset_servers.server_id', '=', reminder.target_id)
          .executeTakeFirst();
        clientId = assetLink?.client_id ?? null;
        break;
      }
    }

    if (!clientId) return [];

    // Get client contacts with WhatsApp notification enabled
    const contacts = await this.db
      .selectFrom('client_contacts')
      .select(['phone'])
      .where('client_id', '=', clientId)
      .where('should_send_wp_notification', '=', true)
      .where('phone', 'is not', null)
      .execute();

    const contactPhones = contacts
      .filter((c) => c.phone)
      .map((c) => c.phone!);

    // Get account managers with phone numbers
    const managers = await this.db
      .selectFrom('client_account_managers')
      .innerJoin('users', 'users.id', 'client_account_managers.manager_id')
      .select('users.phone')
      .where('client_account_managers.client_id', '=', clientId)
      .where('client_account_managers.deleted_at', 'is', null)
      .where('users.is_active', '=', true)
      .where('users.phone', 'is not', null)
      .execute();

    const managerPhones = managers
      .filter((m) => m.phone)
      .map((m) => m.phone!);

    return [...new Set([...contactPhones, ...managerPhones])];
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

    // Get client contacts with notification enabled
    const contacts = await this.db
      .selectFrom('client_contacts')
      .select(['email', 'should_send_notification'])
      .where('client_id', '=', clientId)
      .where('email', 'is not', null)
      .execute();

    const contactEmails = contacts
      .filter((c) => c.should_send_notification && c.email)
      .map((c) => c.email!);

    // Get account managers for this client
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

    // Combine and deduplicate
    return [...new Set([...contactEmails, ...managerEmails])];
  }

}
