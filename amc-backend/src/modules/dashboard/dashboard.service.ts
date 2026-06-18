import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely, sql } from 'kysely';
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
      expiredDomains,
      expiredSslCerts,
      monitorSummary,
      incidentSummary,
    ] = await Promise.all([
      this.getSummary(),
      this.getDomainExpiryStats(now, thirtyDays, sixtyDays, ninetyDays),
      this.getExpiringDomains(ninetyDays),
      managerId ? this.getExpiringDomains(sevenDays, managerId) : Promise.resolve([]),
      this.getExpiringContracts(now, ninetyDays),
      this.getExpiringSslCerts(now, ninetyDays),
      this.getExpiredDomains(now),
      this.getExpiredSslCerts(now),
      this.getMonitorSummary(),
      this.getIncidentSummary(),
    ]);

    return {
      summary,
      domainExpiryStats,
      expiringDomains,
      managerExpiringDomains,
      expiringContracts,
      expiringSsl,
      expiredDomains,
      expiredSslCerts,
      monitorSummary,
      incidentSummary,
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
      .where('contracts.end_date', '<=', threshold)
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
      .where('ssl_certificates.valid_to', '<=', threshold)
      .orderBy('ssl_certificates.valid_to', 'asc')
      .execute();
  }

  private async getExpiredDomains(now: Date) {
    return this.db
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
      .where('domains.expiry_date', '<', now)
      .orderBy('domains.expiry_date', 'desc')
      .limit(10)
      .execute();
  }

  private async getExpiredSslCerts(now: Date) {
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
      .where('ssl_certificates.valid_to', '<', now)
      .orderBy('ssl_certificates.valid_to', 'desc')
      .limit(10)
      .execute();
  }

  private async getIncidentSummary() {
    const now = new Date();

    // Severity breakdown for open incidents
    const severityStats = await this.db
      .selectFrom('incidents')
      .select([
        this.db.fn
          .countAll<number>()
          .filterWhere('resolved_at', 'is', null)
          .as('total_open'),
        this.db.fn
          .countAll<number>()
          .filterWhere('resolved_at', 'is', null)
          .filterWhere('severity', '=', 'critical')
          .as('critical_open'),
        this.db.fn
          .countAll<number>()
          .filterWhere('resolved_at', 'is', null)
          .filterWhere('severity', '=', 'major')
          .as('major_open'),
        this.db.fn
          .countAll<number>()
          .filterWhere('resolved_at', 'is', null)
          .filterWhere('severity', '=', 'minor')
          .as('minor_open'),
        this.db.fn
          .countAll<number>()
          .filterWhere('resolved_at', 'is', null)
          .filterWhere('severity', '=', 'info')
          .as('info_open'),
      ])
      .executeTakeFirst();

    // Most recent open incidents (up to 5)
    const recentIncidents = await this.db
      .selectFrom('incidents')
      .innerJoin('monitors', 'monitors.id', 'incidents.monitor_id')
      .leftJoin('assets', 'assets.id', 'monitors.asset_id')
      .select([
        'incidents.id',
        'incidents.severity',
        'incidents.started_at',
        'incidents.notes',
        'incidents.monitor_id',
        'monitors.name as monitor_name',
        'monitors.target as monitor_target',
        'monitors.current_status as monitor_status',
        'assets.name as asset_name',
      ])
      .where('incidents.resolved_at', 'is', null)
      .orderBy('incidents.started_at', 'desc')
      .limit(5)
      .execute();

    return {
      totalOpen: Number(severityStats?.total_open ?? 0),
      critical: Number(severityStats?.critical_open ?? 0),
      major: Number(severityStats?.major_open ?? 0),
      minor: Number(severityStats?.minor_open ?? 0),
      info: Number(severityStats?.info_open ?? 0),
      recentIncidents,
    };
  }

  async getExpiryCalendar() {
    const now = new Date();
    const sixMonths = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

    const [domains, sslCerts, contracts, servers] = await Promise.all([
      // Domains expiring within 6 months
      this.db
        .selectFrom('domains')
        .innerJoin('assets', 'assets.id', 'domains.asset_id')
        .innerJoin('clients', 'clients.id', 'assets.client_id')
        .select([
          'domains.id',
          'domains.fqdn',
          'domains.expiry_date',
          'domains.auto_renew',
          'assets.name as asset_name',
          'clients.name as client_name',
          sql`'domain'`.as('item_type'),
          sql`null`.as('extra_info'),
        ])
        .where('domains.expiry_date', 'is not', null)
        .where('domains.expiry_date', '>=', now)
        .where('domains.expiry_date', '<=', sixMonths)
        .orderBy('domains.expiry_date', 'asc')
        .execute(),

      // SSL certificates expiring within 6 months
      this.db
        .selectFrom('ssl_certificates')
        .innerJoin('domains', 'domains.id', 'ssl_certificates.domain_id')
        .leftJoin('assets', 'assets.id', 'ssl_certificates.asset_id')
        .select([
          'ssl_certificates.id',
          sql`COALESCE(ssl_certificates.common_name, domains.fqdn)`.as('fqdn'),
          'ssl_certificates.valid_to',
          sql`null::boolean`.as('auto_renew'),
          'assets.name as asset_name',
          sql`null`.as('client_name'),
          sql`'ssl'`.as('item_type'),
          sql`ssl_certificates.issuer`.as('extra_info'),
        ])
        .where('ssl_certificates.valid_to', 'is not', null)
        .where('ssl_certificates.valid_to', '>=', now)
        .where('ssl_certificates.valid_to', '<=', sixMonths)
        .orderBy('ssl_certificates.valid_to', 'asc')
        .execute(),

      // Contracts ending within 6 months
      this.db
        .selectFrom('contracts')
        .innerJoin('clients', 'clients.id', 'contracts.client_id')
        .select([
          'contracts.id',
          sql`contracts.contract_number || ' - ' || clients.name`.as('fqdn'),
          'contracts.end_date',
          'contracts.auto_renew',
          sql`null`.as('asset_name'),
          'clients.name as client_name',
          sql`'contract'`.as('item_type'),
          sql`contracts.billing_cycle || ' · ' || contracts.currency || ' ' || contracts.amount`.as('extra_info'),
        ])
        .where('contracts.deleted_at', 'is', null)
        .where('contracts.end_date', '<=', sixMonths)
        .orderBy('contracts.end_date', 'asc')
        .execute(),

      // Servers renewing within 6 months
      this.db
        .selectFrom('servers')
        .innerJoin('service_providers', 'service_providers.id', 'servers.provider_id')
        .select([
          'servers.id',
          sql`servers.label || ' (' || service_providers.name || ')'`.as('fqdn'),
          'servers.renewal_date',
          sql`null::boolean`.as('auto_renew'),
          sql`null`.as('asset_name'),
          'service_providers.name as client_name',
          sql`'server'`.as('item_type'),
          sql`'$' || servers.monthly_cost || '/' || servers.currency`.as('extra_info'),
        ])
        .where('servers.renewal_date', 'is not', null)
        .where('servers.renewal_date', '>=', now)
        .where('servers.renewal_date', '<=', sixMonths)
        .orderBy('servers.renewal_date', 'asc')
        .execute(),
    ]);

    // Combine and enrich all items
    const allItems = [
      ...domains.map((d) => ({
        ...d,
        date: d.expiry_date,
        days_to_event: d.expiry_date
          ? Math.ceil((new Date(d.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })),
      ...sslCerts.map((s) => ({
        ...s,
        date: s.valid_to,
        days_to_event: s.valid_to
          ? Math.ceil((new Date(s.valid_to).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })),
      ...contracts.map((c) => ({
        ...c,
        date: c.end_date,
        days_to_event: c.end_date
          ? Math.ceil((new Date(c.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })),
      ...servers.map((s) => ({
        ...s,
        date: s.renewal_date,
        days_to_event: s.renewal_date
          ? Math.ceil((new Date(s.renewal_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })),
    ];

    // Sort by date
    allItems.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : Infinity;
      const db = b.date ? new Date(b.date).getTime() : Infinity;
      return da - db;
    });

    // Group by month
    const grouped: Record<string, typeof allItems> = {};
    for (const item of allItems) {
      if (!item.date) continue;
      const d = new Date(item.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }

    return {
      total: allItems.length,
      months: Object.entries(grouped).map(([key, items]) => ({
        key,
        label: new Date(items[0].date!).toLocaleString('en-US', { year: 'numeric', month: 'long' }),
        items,
      })),
    };
  }

  private async getMonitorSummary() {
    const stats = await this.db
      .selectFrom('monitors')
      .select([
        this.db.fn.countAll<number>().as('total'),
        this.db.fn
          .countAll<number>()
          .filterWhere('current_status', '=', 'up')
          .as('up'),
        this.db.fn
          .countAll<number>()
          .filterWhere('current_status', '=', 'down')
          .as('down'),
        this.db.fn
          .countAll<number>()
          .filterWhere('current_status', '=', 'unknown')
          .as('unknown'),
      ])
      .executeTakeFirst();

    return {
      totalMonitors: Number(stats?.total ?? 0),
      upMonitors: Number(stats?.up ?? 0),
      downMonitors: Number(stats?.down ?? 0),
      unknownMonitors: Number(stats?.unknown ?? 0),
    };
  }
}
