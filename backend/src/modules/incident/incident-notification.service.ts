import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely } from 'kysely';
import { DB } from '../../db/types.generated';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class IncidentNotificationService {
  private readonly logger = new Logger(IncidentNotificationService.name);

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly whatsappService: WhatsappService,
  ) {}

  /**
   * Send email notifications for an incident to all relevant stakeholders
   * (client contacts with should_send_notification = true, and account managers).
   */
  async sendNotification(incidentId: string): Promise<void> {
    // Fetch the incident
    const incident = await this.db
      .selectFrom('incidents')
      .selectAll()
      .where('id', '=', incidentId)
      .executeTakeFirst();

    if (!incident) {
      this.logger.warn(`Incident ${incidentId} not found — skipping notification`);
      return;
    }

    // Resolve the client ID from the incident
    let clientId: string | null = null;
    let targetLabel = '';

    if (incident.monitor_id) {
      // Monitor incident: monitor → asset → client
      const monitor = await this.db
        .selectFrom('monitors')
        .leftJoin('assets', 'assets.id', 'monitors.asset_id')
        .select(['monitors.name', 'monitors.target', 'assets.client_id'])
        .where('monitors.id', '=', incident.monitor_id)
        .executeTakeFirst();

      if (monitor) {
        clientId = monitor.client_id;
        targetLabel = `${monitor.name} (${monitor.target})`;
      }
    } else if (incident.target_type === 'domain' && incident.target_id) {
      // Domain expiry incident: domain → asset → client
      const domain = await this.db
        .selectFrom('domains')
        .leftJoin('assets', 'assets.id', 'domains.asset_id')
        .select(['domains.fqdn', 'assets.client_id', 'assets.name as asset_name'])
        .where('domains.id', '=', incident.target_id)
        .executeTakeFirst();

      if (domain) {
        clientId = domain.client_id;
        targetLabel = `${domain.fqdn} (${domain.asset_name ?? 'Domain'})`;
      }
    } else if (incident.target_type === 'ssl' && incident.target_id) {
      // SSL expiry incident: ssl → domain → asset → client
      const ssl = await this.db
        .selectFrom('ssl_certificates')
        .leftJoin('domains', 'domains.id', 'ssl_certificates.domain_id')
        .leftJoin('assets', 'assets.id', 'domains.asset_id')
        .select([
          'ssl_certificates.common_name',
          'domains.fqdn as domain_fqdn',
          'assets.client_id',
          'assets.name as asset_name',
        ])
        .where('ssl_certificates.id', '=', incident.target_id)
        .executeTakeFirst();

      if (ssl) {
        clientId = ssl.client_id;
        targetLabel = `${ssl.common_name ?? ssl.domain_fqdn} (${ssl.asset_name ?? 'SSL'})`;
      }
    }

    if (!clientId) {
      this.logger.warn(
        `Could not resolve client for incident ${incidentId} — skipping notification`,
      );
      return;
    }

    // Collect all recipient emails
    const recipientEmails = new Set<string>();

    // 1. Client contacts with notification enabled
    const contacts = await this.db
      .selectFrom('client_contacts')
      .select(['email'])
      .where('client_id', '=', clientId)
      .where('should_send_notification', '=', true)
      .where('email', 'is not', null)
      .execute();

    for (const c of contacts) {
      if (c.email) recipientEmails.add(c.email);
    }

    // 2. Account managers (active users)
    const accountManagers = await this.db
      .selectFrom('client_account_managers')
      .innerJoin('users', 'users.id', 'client_account_managers.manager_id')
      .select('users.email')
      .where('client_account_managers.client_id', '=', clientId)
      .where('client_account_managers.deleted_at', 'is', null)
      .where('users.is_active', '=', true)
      .where('users.email', 'is not', null)
      .execute();

    for (const m of accountManagers) {
      if (m.email) recipientEmails.add(m.email);
    }

    const severityLabel = (incident.severity ?? 'unknown').toUpperCase();
    const cause = incident.cause ?? 'Monitor Down';
    const startedAt = incident.started_at
      ? new Date(incident.started_at).toISOString().replace('T', ' ').slice(0, 19)
      : 'N/A';
    const notes = incident.notes ?? '';

    // Push in-app notifications to account managers (always, regardless of email recipients)
    this.logger.log(`Pushing in-app notification for incident ${incidentId} to account managers`);
    await this.notificationsService.notifyClientManagers(clientId, {
      type: 'incident',
      title: `${severityLabel} Incident — ${cause}`,
      message: `An incident has been created for ${targetLabel || 'N/A'}. Started: ${startedAt}.`,
      link: `/incidents/${incidentId}`,
      severity: incident.severity === 'critical' || incident.severity === 'major' ? 'critical' : 'warning',
    });

    if (recipientEmails.size === 0) {
      this.logger.log(
        `No recipients found for incident ${incidentId} — skipping email notification`,
      );
      return;
    }

    const subject = `[AMC Portal] ${severityLabel} Incident — ${cause}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #f4f5f7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f4f5f7; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px; background: ${incident.severity === 'critical' ? '#dc2626' : incident.severity === 'major' ? '#ea580c' : '#ca8a04'};">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">
                ${severityLabel} Incident
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 16px; color: #374151; font-size: 14px; line-height: 1.6;">
                An incident has been automatically created. Details are below.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 100px; vertical-align: top;">
                    <strong>Severity</strong>
                  </td>
                  <td style="padding: 8px 0; color: #111827;">
                     ${severityLabel}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 100px; vertical-align: top;">
                    <strong>Cause</strong>
                  </td>
                  <td style="padding: 8px 0; color: #111827;">
                    ${cause}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">
                    <strong>Target</strong>
                  </td>
                  <td style="padding: 8px 0; color: #111827;">
                    ${targetLabel || 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">
                    <strong>Started</strong>
                  </td>
                  <td style="padding: 8px 0; color: #111827;">
                    ${startedAt}
                  </td>
                </tr>
                ${notes ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">
                    <strong>Notes</strong>
                  </td>
                  <td style="padding: 8px 0; color: #111827;">
                    ${notes}
                  </td>
                </tr>` : ''}
              </table>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This is an automated alert from AMC Portal. Please log in to view and manage this incident.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    const text = [
      `${severityLabel} Incident`,
      `Cause: ${cause}`,
      `Target: ${targetLabel || 'N/A'}`,
      `Started: ${startedAt}`,
      notes ? `Notes: ${notes}` : '',
      '',
      'This is an automated alert from AMC Portal.',
    ]
      .filter(Boolean)
      .join('\n');

    const result = await this.emailService.send({
      to: Array.from(recipientEmails),
      subject,
      text,
      html,
    });

    if (result.success) {
      this.logger.log(
        `Incident notification sent for ${incidentId} to ${recipientEmails.size} recipient(s)`,
      );
    } else {
      this.logger.error(
        `Failed to send incident notification for ${incidentId}: ${result.error}`,
      );
    }

    // Fire-and-forget WhatsApp notification
    this.whatsappService.sendIncidentCreated(incident as unknown as Record<string, unknown>).catch(
      (err) => {
        this.logger.error(
          `WhatsApp notification failed for incident ${incidentId}: ${err instanceof Error ? err.message : err}`,
        );
      },
    );
  }
}
