import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely, sql } from 'kysely';
import { DB } from '../../db/types.generated';
import {
  CreateDomainDto,
  UpdateDomainDto,
  ListDomainsDto,
  DomainSortBy,
  SortOrder,
} from './dto';

@Injectable()
export class DomainService {
  private readonly logger = new Logger(DomainService.name);

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
  ) {}

  async create(dto: CreateDomainDto) {
    const domain = await this.db
      .insertInto('domains')
      .values({
        asset_id: dto.asset_id,
        fqdn: dto.fqdn,
        registrar_id: dto.registrar_id ?? null,
        registered_date: dto.registered_date ? new Date(dto.registered_date) : null,
        expiry_date: dto.expiry_date ? new Date(dto.expiry_date) : null,
        auto_renew: dto.auto_renew ?? false,
        nameservers: (dto.nameservers ?? []) as any,
        notes: dto.notes ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Create an initial snapshot
    await this.createSnapshot(domain.id);

    return domain;
  }

  async list(dto: ListDomainsDto) {
    const {
      page = 1,
      limit = 50,
      search,
      asset_id,
      client_id,
      registrar_id,
      expiry_date_from,
      expiry_date_to,
      auto_renew,
      sort_by = DomainSortBy.EXPIRY_DATE,
      sort_order = SortOrder.ASC,
    } = dto;
    const offset = (page - 1) * limit;

    let query = this.db
      .selectFrom('domains')
      .innerJoin('assets', 'assets.id', 'domains.asset_id')
      .leftJoin('service_providers', 'service_providers.id', 'domains.registrar_id');

    if (client_id) {
      query = query.where('assets.client_id', '=', client_id);
    }

    if (search) {
      const pattern = `%${search}%`;
      query = query.where((eb) =>
        eb.or([
          eb('domains.fqdn', 'ilike', pattern),
          eb('assets.name', 'ilike', pattern),
        ]),
      );
    }

    if (asset_id) {
      query = query.where('domains.asset_id', '=', asset_id);
    }

    if (registrar_id) {
      query = query.where('domains.registrar_id', '=', registrar_id);
    }

    if (expiry_date_from) {
      query = query.where('domains.expiry_date', '>=', new Date(expiry_date_from));
    }

    if (expiry_date_to) {
      query = query.where('domains.expiry_date', '<=', new Date(expiry_date_to));
    }

    if (auto_renew !== undefined) {
      query = query.where('domains.auto_renew', '=', auto_renew);
    }

    // Sorting
    const allowedSortColumns: Record<string, string> = {
      [DomainSortBy.FQDN]: 'domains.fqdn',
      [DomainSortBy.ASSET_NAME]: 'assets.name',
      [DomainSortBy.EXPIRY_DATE]: 'domains.expiry_date',
      [DomainSortBy.REGISTERED_DATE]: 'domains.registered_date',
      [DomainSortBy.AUTO_RENEW]: 'domains.auto_renew',
      [DomainSortBy.CREATED_AT]: 'domains.created_at',
      [DomainSortBy.UPDATED_AT]: 'domains.updated_at',
    };

    const sortColumn = allowedSortColumns[sort_by] ?? 'domains.expiry_date';
    const order = sort_order === SortOrder.DESC ? sql`desc` : sql`asc`;

    // ── Run count + data in parallel ──
    const [{ total }, data] = await Promise.all([
      query
        .select(this.db.fn.countAll<number>().as('total'))
        .executeTakeFirst()
        .then((r) => ({ total: Number(r?.total ?? 0) })),
      query
        .clearSelect()
        .select([
          'domains.id',
          'domains.asset_id',
          'domains.fqdn',
          'domains.registrar_id',
          'domains.registered_date',
          'domains.expiry_date',
          'domains.auto_renew',
          'domains.nameservers',
          'domains.notes',
          'domains.last_checked_at',
          'domains.created_at',
          'domains.updated_at',
          'assets.name as asset_name',
          'service_providers.name as registrar_name',
        ])
        .orderBy(sql`${sql.raw(sortColumn)}`, order)
        .limit(limit)
        .offset(offset)
        .execute(),
    ]);

    // Enrich with days-to-expiry and SSL count in batch
    let enriched = data;
    if (data.length > 0) {
      const domainIds = data.map((d) => d.id);
      const now = new Date();

      const sslCounts = await this.db
        .selectFrom('ssl_certificates')
        .select([
          'ssl_certificates.domain_id',
          this.db.fn.countAll<number>().as('ssl_count'),
        ])
        .where('ssl_certificates.domain_id', 'in', domainIds)
        .groupBy('ssl_certificates.domain_id')
        .execute();

      const sslCountMap = new Map(
        sslCounts.map((row) => [row.domain_id, Number(row.ssl_count ?? 0)]),
      );

      enriched = data.map((d) => ({
        ...d,
        ssl_count: sslCountMap.get(d.id) ?? 0,
        days_to_expiry: d.expiry_date
          ? Math.ceil(
              (new Date(d.expiry_date).getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null,
      }));
    }

    return {
      data: enriched,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const domain = await this.db
      .selectFrom('domains')
      .innerJoin('assets', 'assets.id', 'domains.asset_id')
      .leftJoin('service_providers', 'service_providers.id', 'domains.registrar_id')
      .selectAll('domains')
      .select([
        'assets.name as asset_name',
        'assets.client_id as asset_client_id',
        'service_providers.name as registrar_name',
        'service_providers.website as registrar_website',
      ])
      .where('domains.id', '=', id)
      .executeTakeFirst();

    if (!domain) throw new NotFoundException(`Domain ${id} not found`);

    // Fetch SSL certificates for this domain
    const sslCertificates = await this.db
      .selectFrom('ssl_certificates')
      .selectAll()
      .where('ssl_certificates.domain_id', '=', id)
      .orderBy('ssl_certificates.last_checked_at', 'desc')
      .execute();

    // Fetch recent snapshots
    const snapshots = await this.db
      .selectFrom('domain_snapshots')
      .selectAll()
      .where('domain_snapshots.domain_id', '=', id)
      .orderBy('domain_snapshots.checked_at', 'desc')
      .limit(10)
      .execute();

    // Compute days-to-expiry
    const now = new Date();
    const daysToExpiry = domain.expiry_date
      ? Math.ceil(
          (new Date(domain.expiry_date).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    return { ...domain, days_to_expiry: daysToExpiry, sslCertificates, snapshots };
  }

  async update(id: string, dto: UpdateDomainDto) {
    await this.checkExists(id);

    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (dto.asset_id !== undefined) updateData.asset_id = dto.asset_id;
    if (dto.fqdn !== undefined) updateData.fqdn = dto.fqdn;
    if (dto.registrar_id !== undefined) updateData.registrar_id = dto.registrar_id;
    if (dto.registered_date !== undefined) updateData.registered_date = new Date(dto.registered_date);
    if (dto.expiry_date !== undefined) updateData.expiry_date = new Date(dto.expiry_date);
    if (dto.auto_renew !== undefined) updateData.auto_renew = dto.auto_renew;
    if (dto.nameservers !== undefined) updateData.nameservers = dto.nameservers as any;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const domain = await this.db
      .updateTable('domains')
      .set(updateData)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    return domain;
  }

  async remove(id: string) {
    await this.checkExists(id);

    // Delete related snapshots first
    await this.db
      .deleteFrom('domain_snapshots')
      .where('domain_id', '=', id)
      .execute();

    await this.db
      .deleteFrom('domains')
      .where('id', '=', id)
      .execute();

    return { message: 'Domain deleted successfully' };
  }

  // ── WHOIS / Check ──

  async triggerCheck(id: string) {
    const domain = await this.checkExists(id);

    // Placeholder for actual WHOIS lookup — in production this would call
    // a WHOIS/RDAP service and update the domain record.
    // For now, we just record a snapshot with existing data.
    const snapshot = await this.createSnapshot(id);

    await this.db
      .updateTable('domains')
      .set({ last_checked_at: new Date() })
      .where('id', '=', id)
      .execute();

    this.logger.log(`Domain check triggered for ${domain.fqdn} (${id})`);

    return {
      message: 'Domain check completed',
      snapshot,
    };
  }

  async listSnapshots(domainId: string) {
    await this.checkExists(domainId);

    return this.db
      .selectFrom('domain_snapshots')
      .selectAll()
      .where('domain_id', '=', domainId)
      .orderBy('checked_at', 'desc')
      .execute();
  }

  // ── Expiry tracking ──

  async getExpiringDomains(days: number = 30) {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);

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
        'clients.name as client_name',
        'clients.email as client_email',
      ])
      .where('domains.expiry_date', '>=', now)
      .where('domains.expiry_date', '<=', threshold)
      .orderBy('domains.expiry_date', 'asc')
      .execute();
  }

  async getExpiryStats() {
    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const sixtyDays = new Date();
    sixtyDays.setDate(sixtyDays.getDate() + 60);
    const ninetyDays = new Date();
    ninetyDays.setDate(ninetyDays.getDate() + 90);

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

  // ── Helpers ──

  private async createSnapshot(domainId: string) {
    const domainRow = await this.db
      .selectFrom('domains')
      .select(['fqdn', 'expiry_date', 'registrar_id', 'nameservers'])
      .where('id', '=', domainId)
      .executeTakeFirst();

    if (!domainRow) return null;

    // Get registrar name if linked
    let registrarName: string | null = null;
    if (domainRow.registrar_id) {
      const provider = await this.db
        .selectFrom('service_providers')
        .select('name')
        .where('id', '=', domainRow.registrar_id)
        .executeTakeFirst();
      registrarName = provider?.name ?? null;
    }

    const snapshot = await this.db
      .insertInto('domain_snapshots')
      .values({
        domain_id: domainId,
        registrar: registrarName,
        expiry_date: domainRow.expiry_date,
        nameservers: domainRow.nameservers,
      })
      .returningAll()
      .executeTakeFirst();

    return snapshot;
  }

  private async checkExists(id: string) {
    const domain = await this.db
      .selectFrom('domains')
      .selectAll('domains')
      .where('id', '=', id)
      .executeTakeFirst();

    if (!domain) throw new NotFoundException(`Domain ${id} not found`);
    return domain;
  }
}
