import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely } from 'kysely';
import { DB } from '../../db/types.generated';

@Injectable()
export class DashboardService {
  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
  ) {}

  async getOverview(managerId?: string) {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [
      summary,
      domainExpiryStats,
      expiringDomains,
      managerExpiringDomains,
      expiringContracts,
      expiringSsl,
    ] = await Promise.all([
      this.getSummary(),
      this.getDomainExpiryStats(now, thirtyDays, sixtyDays, ninetyDays),
      this.getExpiringDomains(ninetyDays),
      managerId ? this.getExpiringDomains(sevenDays, managerId) : Promise.resolve([]),
      this.getExpiringContracts(now, ninetyDays),
      this.getExpiringSslCerts(now, ninetyDays),
    ]);

    return {
      summary,
      domainExpiryStats,
      expiringDomains,
      managerExpiringDomains,
      expiringContracts,
      expiringSsl,
    };
  }

  async getSummary() {
    const [clientsResult, assetsResult, totalContractsResult, activeContractsResult, domainsResult] =
      await Promise.all([
        this.db
          .selectFrom('clients')
          .select(this.db.fn.countAll<number>().as('clientCount'))
          .where('deleted_at', 'is', null)
          .where('is_active', '=', true)
          .executeTakeFirst(),
        this.db
          .selectFrom('assets')
          .select(this.db.fn.countAll<number>().as('assetCount'))
          .where('deleted_at', 'is', null)
          .executeTakeFirst(),
        this.db
          .selectFrom('contracts')
          .select(this.db.fn.countAll<number>().as('totalContractCount'))
          .where('deleted_at', 'is', null)
          .executeTakeFirst(),
        this.db
          .selectFrom('contracts')
          .select(this.db.fn.countAll<number>().as('activeContractCount'))
          .where('deleted_at', 'is', null)
          .where('status', '=', 'active')
          .executeTakeFirst(),
        this.db
          .selectFrom('domains')
          .select(this.db.fn.countAll<number>().as('domainCount'))
          .executeTakeFirst(),
      ]);

    return {
      totalClients: Number(clientsResult?.clientCount ?? 0),
      totalAssets: Number(assetsResult?.assetCount ?? 0),
      totalContracts: Number(totalContractsResult?.totalContractCount ?? 0),
      activeContracts: Number(activeContractsResult?.activeContractCount ?? 0),
      totalDomains: Number(domainsResult?.domainCount ?? 0),
    };
  }

  private async getDomainExpiryStats(
    now: Date,
    thirtyDays: Date,
    sixtyDays: Date,
    ninetyDays: Date,
  ) {
    const stats = await this.db
      .selectFrom('domains')
      .select([
        this.db.fn.countAll<number>().as('total'),
        this.db.fn
          .countAll<number>()
          .filterWhere('expiry_date', '<', now)
          .as('expired'),
        this.db.fn
          .countAll<number>()
          .filterWhere('expiry_date', '>=', now)
          .filterWhere('expiry_date', '<=', thirtyDays)
          .as('expiring_30_days'),
        this.db.fn
          .countAll<number>()
          .filterWhere('expiry_date', '>', thirtyDays)
          .filterWhere('expiry_date', '<=', sixtyDays)
          .as('expiring_60_days'),
        this.db.fn
          .countAll<number>()
          .filterWhere('expiry_date', '>', sixtyDays)
          .filterWhere('expiry_date', '<=', ninetyDays)
          .as('expiring_90_days'),
      ])
      .executeTakeFirst();

    return {
      total: Number(stats?.total ?? 0),
      expired: Number(stats?.expired ?? 0),
      expiring_30_days: Number(stats?.expiring_30_days ?? 0),
      expiring_60_days: Number(stats?.expiring_60_days ?? 0),
      expiring_90_days: Number(stats?.expiring_90_days ?? 0),
    };
  }

  private async getExpiringDomains(threshold: Date, managerId?: string) {
    let query = this.db
      .selectFrom('domains')
      .innerJoin('assets', 'assets.id', 'domains.asset_id')
      .innerJoin('clients', 'clients.id', 'assets.client_id')
      .select([
        'domains.id',
        'domains.fqdn',
        'domains.expiry_date',
        'domains.auto_renew',
        'domains.last_checked_at',
        'assets.name as asset_name',
        'assets.client_id as client_id',
        'clients.name as client_name',
        'clients.email as client_email',
      ])
      .where('domains.expiry_date', 'is not', null)
      .where('domains.expiry_date', '<=', threshold);

    if (managerId) {
      const managedClientIds = await this.db
        .selectFrom('client_account_managers')
        .select('client_id')
        .where('manager_id', '=', managerId)
        .where('deleted_at', 'is', null)
        .execute()
        .then((rows) => rows.map((r) => r.client_id));

      if (managedClientIds.length > 0) {
        query = query.where('assets.client_id', 'in', managedClientIds);
      } else {
        return [];
      }
    }

    return query.orderBy('domains.expiry_date', 'asc').execute();
  }

  private async getExpiringContracts(now: Date, threshold: Date) {
    return this.db
      .selectFrom('contracts')
      .innerJoin('clients', 'clients.id', 'contracts.client_id')
      .select([
        'contracts.id',
        'contracts.contract_number',
        'contracts.billing_cycle',
        'contracts.start_date',
        'contracts.end_date',
        'contracts.renewal_date',
        'contracts.amount',
        'contracts.currency',
        'contracts.auto_renew',
        'contracts.scope',
        'contracts.status',
        'clients.name as client_name',
        'clients.email as client_email',
      ])
      .where('contracts.deleted_at', 'is', null)
      .where('contracts.end_date', '>=', now)
      .where('contracts.end_date', '<=', threshold)
      .where('contracts.status', '!=', 'expired')
      .orderBy('contracts.end_date', 'asc')
      .execute();
  }

  private async getExpiringSslCerts(now: Date, threshold: Date) {
    return this.db
      .selectFrom('ssl_certificates')
      .innerJoin('domains', 'domains.id', 'ssl_certificates.domain_id')
      .leftJoin('assets', 'assets.id', 'ssl_certificates.asset_id')
      .select([
        'ssl_certificates.id',
        'ssl_certificates.common_name',
        'ssl_certificates.issuer',
        'ssl_certificates.valid_to',
        'ssl_certificates.type',
        'ssl_certificates.last_checked_at',
        'domains.fqdn as domain_fqdn',
        'assets.name as asset_name',
      ])
      .where('ssl_certificates.valid_to', '>=', now)
      .where('ssl_certificates.valid_to', '<=', threshold)
      .orderBy('ssl_certificates.valid_to', 'asc')
      .execute();
  }
}
