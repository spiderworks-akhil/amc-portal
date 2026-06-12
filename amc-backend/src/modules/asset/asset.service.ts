import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely, sql } from 'kysely';
import { DB } from '../../db/types.generated';
import {
  CreateAssetDto,
  UpdateAssetDto,
  ListAssetsDto,
  CreateAssetTypeDto,
  AssetSortBy,
  SortOrder,
} from './dto';

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
  ) {}

  async create(dto: CreateAssetDto) {
    const asset = await this.db
      .insertInto('assets')
      .values({
        name: dto.name,
        client_id: dto.client_id,
        type_id: dto.type_id,
        primary_url: dto.primary_url ?? null,
        status: dto.status ?? 'live',
        primary_contact_name: dto.primary_contact_name ?? null,
        primary_contact_email: dto.primary_contact_email ?? null,
        monitoring_enabled: dto.monitoring_enabled ?? false,
        tech_stack: (dto.tech_stack ?? null) as any,
        custom_fields: (dto.custom_fields ?? null) as any,
        tags: ((dto.tags ?? []) as any),
        notes: dto.notes ?? null,
      })
      .returningAll()
      .executeTakeFirst();

    return asset;
  }

  async list(dto: ListAssetsDto) {
    const {
      page = 1,
      limit = 50,
      search,
      client_id,
      type_id,
      status,
      sort_by = AssetSortBy.NAME,
      sort_order = SortOrder.ASC,
    } = dto;
    const offset = (page - 1) * limit;

    let query = this.db
      .selectFrom('assets')
      .innerJoin('asset_types', 'asset_types.id', 'assets.type_id')
      .innerJoin('clients', 'clients.id', 'assets.client_id')
      .where('assets.deleted_at', 'is', null);

    if (search) {
      const pattern = `%${search}%`;
      query = query.where((eb) => eb.or([
        eb('assets.name', 'ilike', pattern),
        eb('assets.primary_url', 'ilike', pattern),
        eb('assets.primary_contact_name', 'ilike', pattern),
        eb('assets.primary_contact_email', 'ilike', pattern),
        eb('asset_types.name', 'ilike', pattern),
      ]));
    }

    if (client_id) {
      query = query.where('assets.client_id', '=', client_id);
    }

    if (type_id) {
      query = query.where('assets.type_id', '=', type_id);
    }

    if (status) {
      query = query.where('assets.status', '=', status);
    }

    const allowedSortColumns: Record<string, string> = {
      [AssetSortBy.NAME]: 'assets.name',
      [AssetSortBy.STATUS]: 'assets.status',
      [AssetSortBy.CREATED_AT]: 'assets.created_at',
      [AssetSortBy.UPDATED_AT]: 'assets.updated_at',
    };

    const sortColumn = allowedSortColumns[sort_by] ?? 'assets.name';
    const order = sort_order === SortOrder.DESC ? sql`desc` : sql`asc`;

    const [{ total }, data] = await Promise.all([
      query
        .select(this.db.fn.countAll<number>().as('total'))
        .executeTakeFirst()
        .then((r) => ({ total: Number(r?.total ?? 0) })),
      query
        .clearSelect()
        .select([
          'assets.id',
          'assets.name',
          'assets.primary_url',
          'assets.status',
          'assets.type_id',
          'assets.client_id',
          'assets.monitoring_enabled',
          'assets.primary_contact_name',
          'assets.primary_contact_email',
          'assets.created_at',
          'assets.updated_at',
          'asset_types.name as type_name',
          'clients.name as client_name',
        ])
        .orderBy(sql`${sql.raw(sortColumn)}`, order)
        .limit(limit)
        .offset(offset)
        .execute(),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const asset = await this.db
      .selectFrom('assets')
      .innerJoin('asset_types', 'asset_types.id', 'assets.type_id')
      .innerJoin('clients', 'clients.id', 'assets.client_id')
      .selectAll('assets')
      .select([
        'asset_types.name as type_name',
        'clients.name as client_name',
      ])
      .where('assets.id', '=', id)
      .where('assets.deleted_at', 'is', null)
      .executeTakeFirst();

    if (!asset) throw new NotFoundException(`Asset ${id} not found`);

    const [servers, domains, sslCertificates] = await Promise.all([
      this.db
        .selectFrom('asset_servers')
        .innerJoin('servers', 'servers.id', 'asset_servers.server_id')
        .select([
          'servers.id',
          'servers.label',
          'servers.ip_addresses',
          'servers.region',
          'servers.monthly_cost',
          'servers.currency',
          'servers.renewal_date',
        ])
        .where('asset_servers.asset_id', '=', id)
        .execute(),

      this.db
        .selectFrom('domains')
        .leftJoin('service_providers', 'service_providers.id', 'domains.registrar_id')
        .select([
          'domains.id',
          'domains.fqdn',
          'domains.registrar_id',
          'domains.registered_date',
          'domains.expiry_date',
          'domains.auto_renew',
          'domains.nameservers',
          'domains.last_checked_at',
          'service_providers.name as registrar_name',
        ])
        .where('domains.asset_id', '=', id)
        .execute(),

      this.db
        .selectFrom('ssl_certificates')
        .leftJoin('domains', 'domains.id', 'ssl_certificates.domain_id')
        .select([
          'ssl_certificates.id',
          'ssl_certificates.domain_id',
          'ssl_certificates.issuer',
          'ssl_certificates.common_name',
          'ssl_certificates.sans',
          'ssl_certificates.valid_from',
          'ssl_certificates.valid_to',
          'ssl_certificates.type',
          'ssl_certificates.last_checked_at',
          'domains.fqdn as domain_fqdn',
        ])
        .where((eb) =>
          eb.or([
            eb('ssl_certificates.asset_id', '=', id),
            eb('ssl_certificates.domain_id', 'in',
              eb.selectFrom('domains').select('id').where('domains.asset_id', '=', id),
            ),
          ]),
        )
        .execute(),
    ]);

    return { ...asset, servers, domains, ssl_certificates: sslCertificates };
  }

  async update(id: string, dto: UpdateAssetDto) {
    await this.checkExists(id);

    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.primary_url !== undefined) updateData.primary_url = dto.primary_url;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.primary_contact_name !== undefined) updateData.primary_contact_name = dto.primary_contact_name;
    if (dto.primary_contact_email !== undefined) updateData.primary_contact_email = dto.primary_contact_email;
    if (dto.monitoring_enabled !== undefined) updateData.monitoring_enabled = dto.monitoring_enabled;
    if (dto.tech_stack !== undefined) updateData.tech_stack = dto.tech_stack as any;
    if (dto.custom_fields !== undefined) updateData.custom_fields = dto.custom_fields as any;
    if (dto.tags !== undefined) updateData.tags = dto.tags as any;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const asset = await this.db
      .updateTable('assets')
      .set(updateData)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    return asset;
  }

  async delete(id: string) {
    await this.checkExists(id);

    await this.db
      .updateTable('assets')
      .set({ deleted_at: new Date(), updated_at: new Date() })
      .where('id', '=', id)
      .execute();

    return { message: 'Asset deleted successfully' };
  }

  async listTypes() {
    return this.db
      .selectFrom('asset_types')
      .selectAll()
      .orderBy('name', 'asc')
      .execute();
  }

  async createType(dto: CreateAssetTypeDto) {
    const type = await this.db
      .insertInto('asset_types')
      .values({
        name: dto.name,
        description: dto.description ?? null,
      })
      .returningAll()
      .executeTakeFirst();

    return type;
  }

  async getStatsByClient(clientId: string) {
    return this.db
      .selectFrom('assets')
      .select([
        this.db.fn.countAll<number>().as('total'),
        this.db.fn.countAll<number>().filterWhere('status', '=', 'live').as('live'),
        this.db.fn.countAll<number>().filterWhere('status', '=', 'staging').as('staging'),
        this.db.fn.countAll<number>().filterWhere('status', '=', 'development').as('development'),
        this.db.fn.countAll<number>().filterWhere('status', '=', 'parked').as('parked'),
      ])
      .where('client_id', '=', clientId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
      .then((r) => ({
        total: Number(r?.total ?? 0),
        live: Number(r?.live ?? 0),
        staging: Number(r?.staging ?? 0),
        development: Number(r?.development ?? 0),
        parked: Number(r?.parked ?? 0),
      }));
  }

  private async checkExists(id: string) {
    const asset = await this.db
      .selectFrom('assets')
      .select('id')
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!asset) throw new NotFoundException(`Asset ${id} not found`);
    return asset;
  }
}
