import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely, sql } from 'kysely';
import { DB } from '../../db/types.generated';
import {
  CreateServerDto,
  UpdateServerDto,
  ListServersDto,
  ServerSortBy,
  SortOrder,
  AssetIdsDto,
} from './dto';

@Injectable()
export class ServerService {
  private readonly logger = new Logger(ServerService.name);

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
  ) {}

  async create(dto: CreateServerDto) {
    return this.db
      .insertInto('servers')
      .values({
        provider_id: dto.provider_id,
        label: dto.label,
        ip_addresses: JSON.stringify(dto.ip_addresses ?? []),
        region: dto.region ?? null,
        operating_system: dto.operating_system ?? null,
        panel_url: dto.panel_url ?? null,
        monthly_cost: dto.monthly_cost !== undefined ? String(dto.monthly_cost) : null,
        currency: dto.currency ?? 'USD',
        renewal_date: dto.renewal_date ? new Date(dto.renewal_date) : null,
        notes: dto.notes ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async list(dto: ListServersDto) {
    const {
      page = 1,
      limit = 50,
      search,
      provider_id,
      region,
      renewal_date_from,
      renewal_date_to,
      sort_by = ServerSortBy.LABEL,
      sort_order = SortOrder.ASC,
    } = dto;
    const offset = (page - 1) * limit;

    let query = this.db
      .selectFrom('servers')
      .innerJoin('service_providers', 'service_providers.id', 'servers.provider_id');

    if (search) {
      const pattern = `%${search}%`;
      query = query.where((eb) =>
        eb.or([
          eb('servers.label', 'ilike', pattern),
          eb('servers.region', 'ilike', pattern),
          eb('servers.operating_system', 'ilike', pattern),
          eb('service_providers.name', 'ilike', pattern),
        ]),
      );
    }

    if (provider_id) {
      query = query.where('servers.provider_id', '=', provider_id);
    }

    if (region) {
      query = query.where('servers.region', '=', region);
    }

    if (renewal_date_from) {
      query = query.where('servers.renewal_date', '>=', new Date(renewal_date_from));
    }

    if (renewal_date_to) {
      query = query.where('servers.renewal_date', '<=', new Date(renewal_date_to));
    }

    const allowedSortColumns: Record<string, string> = {
      [ServerSortBy.LABEL]: 'servers.label',
      [ServerSortBy.PROVIDER_NAME]: 'service_providers.name',
      [ServerSortBy.REGION]: 'servers.region',
      [ServerSortBy.MONTHLY_COST]: 'servers.monthly_cost',
      [ServerSortBy.RENEWAL_DATE]: 'servers.renewal_date',
      [ServerSortBy.CREATED_AT]: 'servers.created_at',
    };

    const sortColumn = allowedSortColumns[sort_by] ?? 'servers.label';
    const order = sort_order === SortOrder.DESC ? sql`desc` : sql`asc`;

    const [{ total }, data] = await Promise.all([
      query
        .select(this.db.fn.countAll<number>().as('total'))
        .executeTakeFirst()
        .then((r) => ({ total: Number(r?.total ?? 0) })),
      query
        .clearSelect()
        .select([
          'servers.id',
          'servers.provider_id',
          'servers.label',
          'servers.ip_addresses',
          'servers.region',
          'servers.operating_system',
          'servers.panel_url',
          'servers.monthly_cost',
          'servers.currency',
          'servers.renewal_date',
          'servers.notes',
          'servers.created_at',
          'servers.updated_at',
          'service_providers.name as provider_name',
          'service_providers.type as provider_type',
        ])
        .orderBy(sql`${sql.raw(sortColumn)}`, order)
        .limit(limit)
        .offset(offset)
        .execute(),
    ]);

    // Enrich with asset count in batch
    let enriched = data;
    if (data.length > 0) {
      const serverIds = data.map((s) => s.id);

      const assetCounts = await this.db
        .selectFrom('asset_servers')
        .select([
          'asset_servers.server_id',
          this.db.fn.countAll<number>().as('asset_count'),
        ])
        .where('asset_servers.server_id', 'in', serverIds)
        .groupBy('asset_servers.server_id')
        .execute();

      const assetCountMap = new Map(
        assetCounts.map((r) => [r.server_id, Number(r.asset_count ?? 0)]),
      );

      enriched = data.map((s) => ({
        ...s,
        asset_count: assetCountMap.get(s.id) ?? 0,
      }));
    }

    return {
      data: enriched,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const server = await this.db
      .selectFrom('servers')
      .innerJoin('service_providers', 'service_providers.id', 'servers.provider_id')
      .selectAll('servers')
      .select([
        'service_providers.name as provider_name',
        'service_providers.type as provider_type',
        'service_providers.website as provider_website',
      ])
      .where('servers.id', '=', id)
      .executeTakeFirst();

    if (!server) throw new NotFoundException(`Server ${id} not found`);

    // Fetch linked assets
    const assets = await this.db
      .selectFrom('asset_servers')
      .innerJoin('assets', 'assets.id', 'asset_servers.asset_id')
      .innerJoin('asset_types', 'asset_types.id', 'assets.type_id')
      .select([
        'assets.id',
        'assets.name',
        'assets.primary_url',
        'assets.status',
        'asset_types.name as type_name',
      ])
      .where('asset_servers.server_id', '=', id)
      .where('assets.deleted_at', 'is', null)
      .execute();

    return { ...server, assets };
  }

  async update(id: string, dto: UpdateServerDto) {
    await this.checkExists(id);

    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (dto.provider_id !== undefined) updateData.provider_id = dto.provider_id;
    if (dto.label !== undefined) updateData.label = dto.label;
    if (dto.ip_addresses !== undefined) updateData.ip_addresses = JSON.stringify(dto.ip_addresses);
    if (dto.region !== undefined) updateData.region = dto.region;
    if (dto.operating_system !== undefined) updateData.operating_system = dto.operating_system;
    if (dto.panel_url !== undefined) updateData.panel_url = dto.panel_url;
    if (dto.monthly_cost !== undefined) updateData.monthly_cost = String(dto.monthly_cost);
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.renewal_date !== undefined) updateData.renewal_date = new Date(dto.renewal_date);
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    return this.db
      .updateTable('servers')
      .set(updateData)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async remove(id: string) {
    await this.checkExists(id);

    // Unlink all assets first
    await this.db
      .deleteFrom('asset_servers')
      .where('server_id', '=', id)
      .execute();

    await this.db
      .deleteFrom('servers')
      .where('id', '=', id)
      .execute();

    return { message: 'Server deleted successfully' };
  }

  // ── Asset linking ──

  async addAssets(serverId: string, dto: AssetIdsDto) {
    await this.checkExists(serverId);

    const rows = dto.asset_ids.map((asset_id) => ({
      server_id: serverId,
      asset_id,
    }));

    const result = await this.db
      .insertInto('asset_servers')
      .values(rows)
      .onConflict((oc) =>
        oc.columns(['server_id', 'asset_id']).doNothing(),
      )
      .execute();

    return {
      inserted: Number(result[0]?.numInsertedOrUpdatedRows ?? 0),
    };
  }

  async removeAssets(serverId: string, dto: AssetIdsDto) {
    await this.checkExists(serverId);

    const result = await this.db
      .deleteFrom('asset_servers')
      .where('server_id', '=', serverId)
      .where('asset_id', 'in', dto.asset_ids)
      .execute();

    return {
      deleted: Number(result[0]?.numDeletedRows ?? 0),
    };
  }

  async listAssets(serverId: string) {
    await this.checkExists(serverId);

    return this.db
      .selectFrom('asset_servers')
      .innerJoin('assets', 'assets.id', 'asset_servers.asset_id')
      .innerJoin('asset_types', 'asset_types.id', 'assets.type_id')
      .select([
        'assets.id',
        'assets.name',
        'assets.primary_url',
        'assets.status',
        'assets.primary_contact_name',
        'assets.primary_contact_email',
        'asset_types.name as type_name',
      ])
      .where('asset_servers.server_id', '=', serverId)
      .where('assets.deleted_at', 'is', null)
      .execute();
  }

  // ── Renewal tracking ──

  async getExpiringServers(days: number = 30) {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);

    return this.db
      .selectFrom('servers')
      .innerJoin('service_providers', 'service_providers.id', 'servers.provider_id')
      .select([
        'servers.id',
        'servers.label',
        'servers.renewal_date',
        'servers.monthly_cost',
        'servers.currency',
        'service_providers.name as provider_name',
        'service_providers.type as provider_type',
      ])
      .where('servers.renewal_date', '>=', now)
      .where('servers.renewal_date', '<=', threshold)
      .orderBy('servers.renewal_date', 'asc')
      .execute();
  }

  async getRenewalStats() {
    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const sixtyDays = new Date();
    sixtyDays.setDate(sixtyDays.getDate() + 60);
    const ninetyDays = new Date();
    ninetyDays.setDate(ninetyDays.getDate() + 90);

    const stats = await this.db
      .selectFrom('servers')
      .select([
        this.db.fn.countAll<number>().as('total'),
        this.db.fn
          .countAll<number>()
          .filterWhere('renewal_date', '>=', now)
          .filterWhere('renewal_date', '<=', thirtyDays)
          .as('renewing_30_days'),
        this.db.fn
          .countAll<number>()
          .filterWhere('renewal_date', '>', thirtyDays)
          .filterWhere('renewal_date', '<=', sixtyDays)
          .as('renewing_60_days'),
        this.db.fn
          .countAll<number>()
          .filterWhere('renewal_date', '>', sixtyDays)
          .filterWhere('renewal_date', '<=', ninetyDays)
          .as('renewing_90_days'),
        this.db.fn
          .sum<number>('monthly_cost')
          .filterWhere('renewal_date', '>=', now)
          .filterWhere('renewal_date', '<=', thirtyDays)
          .as('cost_at_risk'),
      ])
      .executeTakeFirst();

    return {
      total: Number(stats?.total ?? 0),
      renewing_30_days: Number(stats?.renewing_30_days ?? 0),
      renewing_60_days: Number(stats?.renewing_60_days ?? 0),
      renewing_90_days: Number(stats?.renewing_90_days ?? 0),
      monthly_cost_at_risk: Number(stats?.cost_at_risk ?? 0),
    };
  }

  async getTotalMonthlyCost() {
    const result = await this.db
      .selectFrom('servers')
      .select(this.db.fn.sum<number>('monthly_cost').as('total_cost'))
      .executeTakeFirst();

    return { total_monthly_cost: Number(result?.total_cost ?? 0) };
  }

  // ── Helpers ──

  private async checkExists(id: string) {
    const server = await this.db
      .selectFrom('servers')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst();

    if (!server) throw new NotFoundException(`Server ${id} not found`);
    return server;
  }
}
