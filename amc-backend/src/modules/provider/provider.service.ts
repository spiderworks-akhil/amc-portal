import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely, sql } from 'kysely';
import { DB } from '../../db/types.generated';
import {
  CreateProviderDto,
  UpdateProviderDto,
  ListProvidersDto,
  ProviderSortBy,
  SortOrder,
} from './dto';
import { ProviderType } from 'src/db/types/enums';

@Injectable()
export class ProviderService {
  private readonly logger = new Logger(ProviderService.name);

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
  ) {}

  async create(dto: CreateProviderDto) {
    return this.db
      .insertInto('service_providers')
      .values({
        name: dto.name,
        type: dto.type,
        website: dto.website ?? null,
        notes: dto.notes ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async list(dto: ListProvidersDto) {
    const {
      page = 1,
      limit = 50,
      search,
      type,
      sort_by = ProviderSortBy.NAME,
      sort_order = SortOrder.ASC,
    } = dto;
    const offset = (page - 1) * limit;

    let query = this.db.selectFrom('service_providers');

    if (search) {
      const pattern = `%${search}%`;
      query = query.where((eb) =>
        eb.or([
          eb('name', 'ilike', pattern),
          eb('website', 'ilike', pattern),
          eb('notes', 'ilike', pattern),
        ]),
      );
    }

    if (type) {
      query = query.where('type', '=', type);
    }

    const allowedSortColumns: Record<string, string> = {
      [ProviderSortBy.NAME]: 'name',
      [ProviderSortBy.TYPE]: 'type',
      [ProviderSortBy.CREATED_AT]: 'created_at',
    };

    const sortColumn = allowedSortColumns[sort_by] ?? 'name';
    const order = sort_order === SortOrder.DESC ? sql`desc` : sql`asc`;

    const [{ total }, data] = await Promise.all([
      query
        .select(this.db.fn.countAll<number>().as('total'))
        .executeTakeFirst()
        .then((r) => ({ total: Number(r?.total ?? 0) })),
      query
        .clearSelect()
        .selectAll()
        .orderBy(sql`${sql.raw(sortColumn)}`, order)
        .limit(limit)
        .offset(offset)
        .execute(),
    ]);

    // Enrich with domain count and server count in batch
    let enriched = data;
    if (data.length > 0) {
      const providerIds = data.map((p) => p.id);

      const [domainCounts, serverCounts] = await Promise.all([
        this.db
          .selectFrom('domains')
          .select([
            'domains.registrar_id',
            this.db.fn.countAll<number>().as('domain_count'),
          ])
          .where('domains.registrar_id', 'in', providerIds)
          .groupBy('domains.registrar_id')
          .execute(),
        this.db
          .selectFrom('servers')
          .select([
            'servers.provider_id',
            this.db.fn.countAll<number>().as('server_count'),
          ])
          .where('servers.provider_id', 'in', providerIds)
          .groupBy('servers.provider_id')
          .execute(),
      ]);

      const domainMap = new Map(
        domainCounts.map((r) => [r.registrar_id, Number(r.domain_count ?? 0)]),
      );
      const serverMap = new Map(
        serverCounts.map((r) => [r.provider_id, Number(r.server_count ?? 0)]),
      );

      enriched = data.map((p) => ({
        ...p,
        domain_count: domainMap.get(p.id) ?? 0,
        server_count: serverMap.get(p.id) ?? 0,
      }));
    }

    return {
      data: enriched,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const provider = await this.db
      .selectFrom('service_providers')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!provider) throw new NotFoundException(`Provider ${id} not found`);

    // Fetch associated domains and servers
    const [domains, servers] = await Promise.all([
      this.db
        .selectFrom('domains')
        .innerJoin('assets', 'assets.id', 'domains.asset_id')
        .select([
          'domains.id',
          'domains.fqdn',
          'domains.expiry_date',
          'assets.name as asset_name',
        ])
        .where('domains.registrar_id', '=', id)
        .execute(),
      this.db
        .selectFrom('servers')
        .select(['id', 'label', 'monthly_cost', 'currency', 'renewal_date'])
        .where('servers.provider_id', '=', id)
        .execute(),
    ]);

    return { ...provider, domains, servers };
  }

  async update(id: string, dto: UpdateProviderDto) {
    await this.checkExists(id);

    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.website !== undefined) updateData.website = dto.website;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    return this.db
      .updateTable('service_providers')
      .set(updateData)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async remove(id: string) {
    await this.checkExists(id);

    // Check if any domains or servers reference this provider
    const [domainRefs, serverRefs] = await Promise.all([
      this.db
        .selectFrom('domains')
        .select('id')
        .where('registrar_id', '=', id)
        .limit(1)
        .execute(),
      this.db
        .selectFrom('servers')
        .select('id')
        .where('provider_id', '=', id)
        .limit(1)
        .execute(),
    ]);

    if (domainRefs.length > 0 || serverRefs.length > 0) {
      throw new ConflictException(
        `Provider ${id} cannot be deleted — it is referenced by existing domains or servers. Remove those associations first.`,
      );
    }

    await this.db
      .deleteFrom('service_providers')
      .where('id', '=', id)
      .execute();

    return { message: 'Provider deleted successfully' };
  }

  async getTypes() {
    // Return available provider types with counts
    const counts = await this.db
      .selectFrom('service_providers')
      .select([
        'type',
        this.db.fn.countAll<number>().as('count'),
      ])
      .groupBy('type')
      .orderBy('type', 'asc')
      .execute();

    const allTypes = Object.values(ProviderType);
    return allTypes.map((t) => ({
      type: t,
      count: Number(counts.find((c) => c.type === t)?.count ?? 0),
    }));
  }

  async getStats() {
    const stats = await this.db
      .selectFrom('service_providers')
      .select([
        this.db.fn.countAll<number>().as('total'),
      ])
      .executeTakeFirst();

    return {
      total: Number(stats?.total ?? 0),
    };
  }

  async getByType(type: string) {
    return this.db
      .selectFrom('service_providers')
      .selectAll()
      .where('type', '=', type)
      .orderBy('name', 'asc')
      .execute();
  }

  private async checkExists(id: string) {
    const provider = await this.db
      .selectFrom('service_providers')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst();

    if (!provider) throw new NotFoundException(`Provider ${id} not found`);
    return provider;
  }
}
