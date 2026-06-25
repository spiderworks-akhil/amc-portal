import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely, sql } from 'kysely';
import { DB } from '../db/types.generated';
import { ReminderRulesService } from '../modules/reminder/reminder-rules/reminder-rules.service';

interface ExpiringEntity {
  id: string;
  label: string;
  expiryDate: Date;
  targetType: 'domain' | 'ssl' | 'contract' | 'server';
}

@Processor('reminder-creation', {
  concurrency: 1,
})
export class ReminderCreationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderCreationProcessor.name);

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
    private readonly rulesService: ReminderRulesService,
  ) {
    super();
  }

  async process(job: Job<unknown>): Promise<{ created: number }> {
    this.logger.log('Reminder creation job: starting');
    const created = await this.createPendingReminders();
    this.logger.log(`Reminder creation job: complete — ${created} reminders created`);
    return { created };
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
        const triggerDays = rule.trigger_days as number[];

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
              (rule.channels as string[])[0] ?? 'email';

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
}
