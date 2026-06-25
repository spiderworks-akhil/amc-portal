import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely } from 'kysely';
import { firstValueFrom } from 'rxjs';
import { DB } from '../../db/types.generated';
import { ConfigService } from '../config/config.service';

interface WhatsAppConfig {
  api_key: string;
  api_secret?: string;
  phone_number_id: string;
  business_account_id?: string;
  webhook_verify_token?: string;
  domain_created_template?: string;
  ssl_created_template?: string;
  server_created_template?: string;
  incident_created_template?: string;
  domain_expiry_template?: string;
  ssl_expiry_template?: string;
  server_expiry_template?: string;
  contract_expiry_template?: string;
}

interface Recipient {
  phone: string;
  name?: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly apiBase = 'https://graph.facebook.com/v22.0';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectKysely() private readonly db: Kysely<DB>,
  ) {}

  /**
   * Load WhatsApp configuration from the app_configs table.
   */
  private async getConfig(): Promise<WhatsAppConfig | null> {
    try {
      const row = await this.configService.getConfig('whatsapp');
      return row.config as unknown as WhatsAppConfig;
    } catch {
      this.logger.warn('WhatsApp config not found — skipping notification');
      return null;
    }
  }

  /**
   * Build a standardised set of template body parameters for a given entity type (creation event).
   */
  private buildTemplateParams(
    entityType: 'domain' | 'ssl' | 'server' | 'incident',
    entity: Record<string, unknown>,
  ): Array<{ type: string; text: string }> {
    const params: Array<{ type: string; text: string }> = [];

    // Common first parameter: entity name / identifier
    let name = '';
    switch (entityType) {
      case 'domain':
        name = (entity.fqdn as string) ?? (entity.common_name as string) ?? 'Unknown Domain';
        break;
      case 'ssl':
        name = (entity.common_name as string) ?? (entity.domain_fqdn as string) ?? 'Unknown SSL';
        break;
      case 'server':
        name = (entity.label as string) ?? 'Unknown Server';
        break;
      case 'incident':
        name = (entity.cause as string) ?? (entity.severity as string) ?? 'Unknown Incident';
        break;
    }
    params.push({ type: 'text', text: name });

    // Second parameter: date created
    const createdAt = entity.created_at
      ? new Date(entity.created_at as string).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    params.push({ type: 'text', text: createdAt });

    // Third parameter: additional context (expiry date, severity, etc.)
    let extra = '';
    switch (entityType) {
      case 'domain':
        extra = (entity.expiry_date as string)
          ? `Expires: ${new Date(entity.expiry_date as string).toISOString().split('T')[0]}`
          : 'No expiry date set';
        break;
      case 'ssl':
        extra = (entity.valid_to as string)
          ? `Expires: ${new Date(entity.valid_to as string).toISOString().split('T')[0]}`
          : 'No expiry date set';
        break;
      case 'server':
        extra = (entity.renewal_date as string)
          ? `Renewal: ${new Date(entity.renewal_date as string).toISOString().split('T')[0]}`
          : `Provider: ${(entity.provider_name as string) ?? (entity.provider_id as string) ?? 'N/A'}`;
        break;
      case 'incident':
        extra = `Severity: ${(entity.severity as string)?.toUpperCase() ?? 'N/A'}`;
        break;
    }
    if (extra) {
      params.push({ type: 'text', text: extra });
    }

    return params;
  }

  /**
   * Build template parameters for expiry reminder messages.
   * Expects 3 text params: entity label, days remaining, expiry date.
   */
  private buildExpiryTemplateParams(
    targetLabel: string,
    daysRemaining: number,
    expiryDate: string,
  ): Array<{ type: string; text: string }> {
    return [
      { type: 'text', text: targetLabel },
      { type: 'text', text: String(daysRemaining) },
      { type: 'text', text: expiryDate },
    ];
  }

  /**
   * Log a WhatsApp send attempt to the notification_history table.
   */
  private async logHistory(
    reminderId: string | undefined,
    recipient: string,
    success: boolean,
    providerMessageId: string | null,
  ): Promise<void> {
    try {
      await this.db
        .insertInto('notification_history')
        .values({
          reminder_id: reminderId ?? '',
          recipient,
          channel: 'whatsapp',
          status: success ? 'sent' : 'failed',
          provider_message_id: providerMessageId,
          sent_at: new Date(),
          delivered_at: success ? new Date() : null,
          failed_at: success ? null : new Date(),
        })
        .execute();
    } catch (err) {
      this.logger.error(`Failed to log WhatsApp notification history: ${err}`);
    }
  }

  /**
   * Send a WhatsApp template message to a single recipient and log the outcome.
   */
  private async sendTemplateMessage(
    config: WhatsAppConfig,
    to: string,
    templateName: string,
    bodyParams: Array<{ type: string; text: string }>,
    reminderId?: string,
  ): Promise<boolean> {
    try {
      const url = `${this.apiBase}/${config.phone_number_id}/messages`;

      const body: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: bodyParams,
            },
          ],
        },
      };

      const response = await firstValueFrom(
        this.httpService.post(url, body, {
          headers: {
            Authorization: `Bearer ${config.api_key}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      // Extract a provider message ID from the response if available
      const messages = (response.data as { messages?: Array<{ id: string }> })?.messages;
      const providerMessageId = messages?.[0]?.id ?? null;

      this.logger.log(
        `WhatsApp template "${templateName}" sent to ${to}: ${JSON.stringify(response.data)}`,
      );

      if (reminderId) {
        await this.logHistory(reminderId, to, true, providerMessageId);
      }
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      let detail = '';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; data?: unknown } };
        if (axiosErr.response) {
          detail = ` | Status: ${axiosErr.response.status} | Response: ${JSON.stringify(axiosErr.response.data)}`;
        }
      }
      this.logger.error(
        `Failed to send WhatsApp template "${templateName}" to ${to}: ${message}${detail}`,
      );
  
      if (reminderId) {
        await this.logHistory(reminderId, to, false, null);
      }
      return false;
    }
  }


  private async resolveRecipientsByTargetType(
    targetType: 'domain' | 'ssl' | 'server' | 'contract',
    targetId: string,
  ): Promise<Recipient[]> {
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
        // Servers link to assets via asset_servers
        const assetLink = await this.db
          .selectFrom('asset_servers')
          .innerJoin('assets', 'assets.id', 'asset_servers.asset_id')
          .select('assets.client_id')
          .where('asset_servers.server_id', '=', targetId)
          .executeTakeFirst();
        clientId = assetLink?.client_id ?? null;
        break;
      }
    }

    if (!clientId) return [];
    return this.resolveRecipientsForClient(clientId);
  }

  /**
   * Resolve the phone numbers of client contacts and account managers
   * linked to the given asset (via its client_id), for a new entity event.
   */
  private async resolveRecipientsForAsset(assetId: string): Promise<Recipient[]> {
    // Fetch asset to get client_id
    const asset = await this.db
      .selectFrom('assets')
      .select(['id', 'client_id'])
      .where('id', '=', assetId)
      .executeTakeFirst();

    if (!asset?.client_id) return [];

    return this.resolveRecipientsForClient(asset.client_id);
  }

  /**
   * Resolve the phone numbers of client contacts and account managers
   * for a given client.
   */
  private async resolveRecipientsForClient(clientId: string): Promise<Recipient[]> {
    const recipients = new Map<string, Recipient>();

    // 1. Client contacts with notification enabled
    const contacts = await this.db
      .selectFrom('client_contacts')
      .select(['name', 'phone'])
      .where('client_id', '=', clientId)
      .where('should_send_notification', '=', true)
      .where('phone', 'is not', null)
      .execute();

    for (const c of contacts) {
      if (c.phone) {
        recipients.set(c.phone, { phone: c.phone, name: c.name ?? undefined });
      }
    }

    // 2. Account managers with phone numbers
    const managers = await this.db
      .selectFrom('client_account_managers')
      .innerJoin('users', 'users.id', 'client_account_managers.manager_id')
      .select(['users.name', 'users.phone'])
      .where('client_account_managers.client_id', '=', clientId)
      .where('client_account_managers.deleted_at', 'is', null)
      .where('users.is_active', '=', true)
      .where('users.phone', 'is not', null)
      .execute();

    for (const m of managers) {
      if (m.phone) {
        recipients.set(m.phone, { phone: m.phone, name: m.name ?? undefined });
      }
    }

    return Array.from(recipients.values());
  }

  /**
   * Resolve recipients by incident context (monitor → asset → client).
   */
  private async resolveRecipientsForIncident(
    incident: Record<string, unknown>,
  ): Promise<Recipient[]> {
    let clientId: string | null = null;

    if (incident.monitor_id) {
      const monitor = await this.db
        .selectFrom('monitors')
        .leftJoin('assets', 'assets.id', 'monitors.asset_id')
        .select(['assets.client_id'])
        .where('monitors.id', '=', incident.monitor_id as string)
        .executeTakeFirst();
      clientId = monitor?.client_id ?? null;
    } else if (incident.target_type === 'domain' && incident.target_id) {
      const domain = await this.db
        .selectFrom('domains')
        .leftJoin('assets', 'assets.id', 'domains.asset_id')
        .select(['assets.client_id'])
        .where('domains.id', '=', incident.target_id as string)
        .executeTakeFirst();
      clientId = domain?.client_id ?? null;
    } else if (incident.target_type === 'ssl' && incident.target_id) {
      const ssl = await this.db
        .selectFrom('ssl_certificates')
        .leftJoin('domains', 'domains.id', 'ssl_certificates.domain_id')
        .leftJoin('assets', 'assets.id', 'domains.asset_id')
        .select(['assets.client_id'])
        .where('ssl_certificates.id', '=', incident.target_id as string)
        .executeTakeFirst();
      clientId = ssl?.client_id ?? null;
    }

    if (!clientId) return [];
    return this.resolveRecipientsForClient(clientId);
  }

  // ── Public notification methods ──

  /**
   * Send WhatsApp notification for a newly created domain.
   */
  async sendDomainCreated(domain: Record<string, unknown>): Promise<void> {
    const config = await this.getConfig();
    this.logger.log("Called whatsapp for sending domain created notification")
    if (!config?.domain_created_template || !config.phone_number_id) {
      this.logger.warn(
        `WhatsApp config incomplete — domain_created_template: ${config?.domain_created_template ? 'set' : 'missing'}, phone_number_id: ${config?.phone_number_id ? 'set' : 'missing'}`,
      );
      return;
    }

    const recipients = await this.resolveRecipientsForAsset(domain.asset_id as string);
    if (recipients.length === 0) {
      this.logger.log('No WhatsApp recipients found for domain creation — skipping');
      return;
    }

    this.logger.log(
      `Sending domain WhatsApp notification for "${domain.fqdn ?? domain.id}" to ${recipients.length} recipient(s): ${recipients.map((r) => r.phone).join(', ')}`,
    );

    const bodyParams = this.buildTemplateParams('domain', domain);
    this.logger.debug(`Template params for domain "${domain.fqdn}": ${JSON.stringify(bodyParams)}`);

    for (const r of recipients) {
      await this.sendTemplateMessage(config, r.phone, config.domain_created_template, bodyParams);
    }

    this.logger.log(`Domain WhatsApp notification sent to ${recipients.length} recipient(s)`);
  }

  /**
   * Send WhatsApp notification for a newly created SSL certificate.
   */
  async sendSslCreated(ssl: Record<string, unknown>): Promise<void> {
    const config = await this.getConfig();
    if (!config?.ssl_created_template || !config.phone_number_id) return;

    // Resolve asset_id from the linked domain if not set on the SSL record directly
    let assetId = ssl.asset_id as string | undefined;
    if (!assetId && ssl.domain_id) {
      const domain = await this.db
        .selectFrom('domains')
        .select('asset_id')
        .where('id', '=', ssl.domain_id as string)
        .executeTakeFirst();
      assetId = domain?.asset_id ?? undefined;
    }

    const recipients = assetId
      ? await this.resolveRecipientsForAsset(assetId)
      : [];

    if (recipients.length === 0) {
      this.logger.log('No WhatsApp recipients found for SSL creation — skipping');
      return;
    }

    const bodyParams = this.buildTemplateParams('ssl', ssl);

    for (const r of recipients) {
      await this.sendTemplateMessage(config, r.phone, config.ssl_created_template, bodyParams);
    }

    this.logger.log(`SSL WhatsApp notification sent to ${recipients.length} recipient(s)`);
  }

  /**
   * Send WhatsApp notification for a newly created server.
   */
  async sendServerCreated(server: Record<string, unknown>): Promise<void> {
    const config = await this.getConfig();
    if (!config?.server_created_template || !config.phone_number_id) return;

    // Resolve asset IDs linked to this server
    const assetLinks = await this.db
      .selectFrom('asset_servers')
      .select('asset_id')
      .where('server_id', '=', server.id as string)
      .execute();

    const assetIds = assetLinks.map((a) => a.asset_id);

    // Collect unique recipients across all linked assets
    const allRecipients = new Map<string, Recipient>();
    for (const assetId of assetIds) {
      const recipients = await this.resolveRecipientsForAsset(assetId);
      for (const r of recipients) {
        allRecipients.set(r.phone, r);
      }
    }

    if (allRecipients.size === 0) {
      this.logger.log('No WhatsApp recipients found for server creation — skipping');
      return;
    }

    const bodyParams = this.buildTemplateParams('server', server);

    for (const r of allRecipients.values()) {
      await this.sendTemplateMessage(config, r.phone, config.server_created_template, bodyParams);
    }

    this.logger.log(`Server WhatsApp notification sent to ${allRecipients.size} recipient(s)`);
  }

  /**
   * Send WhatsApp notification for a newly created incident.
   */
  async sendIncidentCreated(incident: Record<string, unknown>): Promise<void> {
    const config = await this.getConfig();
    if (!config?.incident_created_template || !config.phone_number_id) return;

    const recipients = await this.resolveRecipientsForIncident(incident);
    if (recipients.length === 0) {
      this.logger.log('No WhatsApp recipients found for incident creation — skipping');
      return;
    }

    const bodyParams = this.buildTemplateParams('incident', incident);

    for (const r of recipients) {
      await this.sendTemplateMessage(config, r.phone, config.incident_created_template, bodyParams);
    }

    this.logger.log(`Incident WhatsApp notification sent to ${recipients.length} recipient(s)`);
  }

  // ── Expiry reminder public methods ──

  /**
   * Send a WhatsApp expiry reminder to all relevant recipients.
   */
  private async sendExpiryReminder(
    targetType: 'domain' | 'ssl' | 'server' | 'contract',
    targetId: string,
    targetLabel: string,
    daysRemaining: number,
    expiryDate: string,
    templateName: string,
    reminderId?: string,
  ): Promise<void> {
    const config = await this.getConfig();
    if (!config?.[templateName as keyof WhatsAppConfig] || !config.phone_number_id) return;

    const recipients = await this.resolveRecipientsByTargetType(targetType, targetId);
    if (recipients.length === 0) {
      this.logger.log(`No WhatsApp recipients found for ${targetType} expiry reminder — skipping`);
      return;
    }

    const template = config[templateName as keyof WhatsAppConfig] as string;
    const bodyParams = this.buildExpiryTemplateParams(targetLabel, daysRemaining, expiryDate);

    for (const r of recipients) {
      await this.sendTemplateMessage(config, r.phone, template, bodyParams, reminderId);
    }

    this.logger.log(
      `WhatsApp expiry reminder sent for ${targetType} "${targetLabel}" to ${recipients.length} recipient(s)`,
    );
  }

  /**
   * Send WhatsApp expiry reminder for a domain.
   */
  async sendDomainExpiryReminder(
    domainId: string,
    targetLabel: string,
    daysRemaining: number,
    expiryDate: string,
    reminderId?: string,
  ): Promise<void> {
    return this.sendExpiryReminder('domain', domainId, targetLabel, daysRemaining, expiryDate, 'domain_expiry_template', reminderId);
  }

  /**
   * Send WhatsApp expiry reminder for an SSL certificate.
   */
  async sendSslExpiryReminder(
    sslId: string,
    targetLabel: string,
    daysRemaining: number,
    expiryDate: string,
    reminderId?: string,
  ): Promise<void> {
    return this.sendExpiryReminder('ssl', sslId, targetLabel, daysRemaining, expiryDate, 'ssl_expiry_template', reminderId);
  }

  /**
   * Send WhatsApp expiry reminder for a server.
   */
  async sendServerExpiryReminder(
    serverId: string,
    targetLabel: string,
    daysRemaining: number,
    expiryDate: string,
    reminderId?: string,
  ): Promise<void> {
    return this.sendExpiryReminder('server', serverId, targetLabel, daysRemaining, expiryDate, 'server_expiry_template', reminderId);
  }

  /**
   * Send WhatsApp expiry reminder for a contract.
   */
  async sendContractExpiryReminder(
    contractId: string,
    targetLabel: string,
    daysRemaining: number,
    expiryDate: string,
    reminderId?: string,
  ): Promise<void> {
    return this.sendExpiryReminder('contract', contractId, targetLabel, daysRemaining, expiryDate, 'contract_expiry_template', reminderId);
  }
}
