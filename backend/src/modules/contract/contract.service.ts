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
  CreateContractDto,
  UpdateContractDto,
  ListContractsDto,
  ContractSortBy,
  SortOrder,
  AssetIdsDto,
  RenewContractDto,
} from './dto';

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
  ) {}

  async create(dto: CreateContractDto, createdBy?: string) {
    // Auto-generate contract number if not provided
    const contract_number =
      dto.contract_number || (await this.generateContractNumber(dto.client_id));

    const contract = await this.db
      .insertInto('contracts')
      .values({
        client_id: dto.client_id,
        label: dto.label ?? null,
        contract_number,
        billing_cycle: dto.billing_cycle,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        renewal_date: new Date(dto.renewal_date),
        amount: dto.amount != null ? String(dto.amount) : null,
        currency: dto.currency ?? 'USD',
        auto_renew: dto.auto_renew ?? false,
        status: dto.status ?? 'active',
        created_by_id: createdBy ?? null,
      })
      .returningAll()
      .executeTakeFirst();

    return contract;
  }

  async list(dto: ListContractsDto) {
    const {
      page = 1,
      limit = 50,
      search,
      client_id,
      asset_id,
      status,
      start_date_from,
      start_date_to,
      end_date_from,
      end_date_to,
      renewal_date_from,
      renewal_date_to,
      auto_renew,
      sort_by = ContractSortBy.END_DATE,
      sort_order = SortOrder.ASC,
    } = dto;
    const offset = (page - 1) * limit;

    // Base query with joins for client name and asset count
    let query = this.db
      .selectFrom('contracts')
      .innerJoin('clients', 'clients.id', 'contracts.client_id')
      .where('contracts.deleted_at', 'is', null);

    // ── Filters ──
    if (search) {
      const pattern = `%${search}%`;
      query = query.where((eb) =>
        eb.or([
          eb('contracts.contract_number', 'ilike', pattern),
          eb('contracts.label', 'ilike', pattern),
          eb('clients.name', 'ilike', pattern),
        ]),
      );
    }

    if (client_id) {
      query = query.where('contracts.client_id', '=', client_id);
    }

    if (asset_id) {
      query = query.where('contracts.id', 'in', (eb) =>
        eb.selectFrom('contract_assets')
          .select('contract_assets.contract_id')
          .where('contract_assets.asset_id', '=', asset_id),
      );
    }

    if (status) {
      query = query.where('contracts.status', '=', status);
    }

    if (start_date_from) {
      query = query.where('contracts.start_date', '>=', new Date(start_date_from));
    }

    if (start_date_to) {
      query = query.where('contracts.start_date', '<=', new Date(start_date_to));
    }

    if (end_date_from) {
      query = query.where('contracts.end_date', '>=', new Date(end_date_from));
    }

    if (end_date_to) {
      query = query.where('contracts.end_date', '<=', new Date(end_date_to));
    }

    if (renewal_date_from) {
      query = query.where('contracts.renewal_date', '>=', new Date(renewal_date_from));
    }

    if (renewal_date_to) {
      query = query.where('contracts.renewal_date', '<=', new Date(renewal_date_to));
    }

    if (auto_renew !== undefined) {
      query = query.where('contracts.auto_renew', '=', auto_renew);
    }

    // ── Sorting ──
    // Map enum to actual SQL expressions (supports cross-table sort)
    const allowedSortColumns: Record<string, string> = {
      [ContractSortBy.CONTRACT_NUMBER]: 'contracts.contract_number',
      [ContractSortBy.CLIENT_NAME]: 'clients.name',
      [ContractSortBy.START_DATE]: 'contracts.start_date',
      [ContractSortBy.END_DATE]: 'contracts.end_date',
      [ContractSortBy.RENEWAL_DATE]: 'contracts.renewal_date',
      [ContractSortBy.AMOUNT]: 'contracts.amount',
      [ContractSortBy.STATUS]: 'contracts.status',
      [ContractSortBy.CREATED_AT]: 'contracts.created_at',
      [ContractSortBy.UPDATED_AT]: 'contracts.updated_at',
    };

    const sortColumn = allowedSortColumns[sort_by] ?? 'contracts.end_date';
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
          'contracts.id',
          'contracts.client_id',
          'contracts.contract_number',
          'contracts.label',
          'contracts.billing_cycle',
          'contracts.start_date',
          'contracts.end_date',
          'contracts.renewal_date',
          'contracts.amount',
          'contracts.currency',
          'contracts.auto_renew',
          'contracts.status',
          'contracts.created_at',
          'contracts.updated_at',
          'clients.name as client_name',
        ])
        .orderBy(sql`${sql.raw(sortColumn)}`, order)
        .limit(limit)
        .offset(offset)
        .execute(),
    ]);

    // ── Enrich with asset counts in batch ──
    let enriched = data;
    if (data.length > 0) {
      const contractIds = data.map((c) => c.id);

      const assetCounts = await this.db
        .selectFrom('contract_assets')
        .select([
          'contract_assets.contract_id',
          this.db.fn.countAll<number>().as('asset_count'),
        ])
        .where('contract_assets.contract_id', 'in', contractIds)
        .groupBy('contract_assets.contract_id')
        .execute();

      const assetCountMap = new Map(
        assetCounts.map((row) => [row.contract_id, Number(row.asset_count ?? 0)]),
      );

      enriched = data.map((c) => ({
        ...c,
        asset_count: assetCountMap.get(c.id) ?? 0,
      }));
    }

    return {
      data: enriched,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const contract = await this.db
      .selectFrom('contracts')
      .innerJoin('clients', 'clients.id', 'contracts.client_id')
      .selectAll('contracts')
      .select([
        'clients.name as client_name',
        'clients.email as client_email',
        'clients.company as client_company',
      ])
      .where('contracts.id', '=', id)
      .where('contracts.deleted_at', 'is', null)
      .executeTakeFirst();

    if (!contract) throw new NotFoundException(`Contract ${id} not found`);

    // Fetch linked assets
    const assets = await this.db
      .selectFrom('contract_assets')
      .innerJoin('assets', 'assets.id', 'contract_assets.asset_id')
      .select([
        'assets.id',
        'assets.name',
        'assets.status',
        'assets.type as type_name',
      ])
      .where('contract_assets.contract_id', '=', id)
      .where('assets.deleted_at', 'is', null)
      .execute();

    // Fetch renewal history
    const renewals = await this.db
      .selectFrom('contract_renewals')
      .selectAll()
      .where('contract_id', '=', id)
      .orderBy('renewed_at', 'desc')
      .execute();

    // Fetch linked scopes
    const scopes = await this.db
      .selectFrom('contract_scopes')
      .innerJoin('scopes', 'scopes.id', 'contract_scopes.scope_id')
      .selectAll('scopes')
      .where('contract_scopes.contract_id', '=', id)
      .orderBy('scopes.name', 'asc')
      .execute();

    return { ...contract, assets, renewals, scopes };
  }

  async update(id: string, dto: UpdateContractDto) {
    await this.checkExists(id);

    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (dto.label !== undefined) updateData.label = dto.label;
    if (dto.contract_number !== undefined) updateData.contract_number = dto.contract_number;
    if (dto.billing_cycle !== undefined) updateData.billing_cycle = dto.billing_cycle;
    if (dto.start_date !== undefined) updateData.start_date = new Date(dto.start_date);
    if (dto.end_date !== undefined) updateData.end_date = new Date(dto.end_date);
    if (dto.renewal_date !== undefined) updateData.renewal_date = new Date(dto.renewal_date);
    if (dto.amount !== undefined) updateData.amount = String(dto.amount);
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.auto_renew !== undefined) updateData.auto_renew = dto.auto_renew;
    if (dto.scope !== undefined) updateData.scope = dto.scope;
    if (dto.status !== undefined) updateData.status = dto.status;

    const contract = await this.db
      .updateTable('contracts')
      .set(updateData)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    return contract;
  }

  async remove(id: string) {
    await this.checkExists(id);

    await this.db
      .updateTable('contracts')
      .set({ deleted_at: new Date(), updated_at: new Date() })
      .where('id', '=', id)
      .execute();

    return { message: 'Contract deleted successfully' };
  }

  // ── Asset linking ──

  async addAssets(contractId: string, dto: AssetIdsDto) {
    await this.checkExists(contractId);

    const rows = dto.asset_ids.map((asset_id) => ({
      contract_id: contractId,
      asset_id,
    }));

    const result = await this.db
      .insertInto('contract_assets')
      .values(rows)
      .onConflict((oc) =>
        oc.columns(['contract_id', 'asset_id']).doNothing(),
      )
      .execute();

    return {
      inserted: Number(result[0]?.numInsertedOrUpdatedRows ?? 0),
    };
  }

  async removeAssets(contractId: string, dto: AssetIdsDto) {
    await this.checkExists(contractId);

    const result = await this.db
      .deleteFrom('contract_assets')
      .where('contract_id', '=', contractId)
      .where('asset_id', 'in', dto.asset_ids)
      .execute();

    return {
      deleted: Number(result[0]?.numDeletedRows ?? 0),
    };
  }

  async listAssets(contractId: string) {
    await this.checkExists(contractId);

    return this.db
      .selectFrom('contract_assets')
      .innerJoin('assets', 'assets.id', 'contract_assets.asset_id')
      .select([
        'assets.id',
        'assets.name',
        'assets.status',
        'assets.primary_contact_name',
        'assets.primary_contact_email',
        'assets.type as type_name',
      ])
      .where('contract_assets.contract_id', '=', contractId)
      .where('assets.deleted_at', 'is', null)
      .execute();
  }

  // ── Renewals ──

  async renew(contractId: string, dto: RenewContractDto) {
    const contract = await this.checkExists(contractId);

    // Create a renewal record
    const renewal = await this.db
      .insertInto('contract_renewals')
      .values({
        contract_id: contractId,
        previous_end_date: contract.end_date,
        new_start_date: new Date(dto.new_start_date),
        new_end_date: new Date(dto.new_end_date),
        amount: dto.amount !== undefined ? String(dto.amount) : contract.amount,
        notes: dto.notes ?? null,
      })
      .returningAll()
      .executeTakeFirst();

    // Update the contract with new dates, amount, and recalculate renewal_date
    const newEndDate = new Date(dto.new_end_date);
    // Set renewal_date to 30 days before new end date by default
    const renewalDate = new Date(newEndDate);
    renewalDate.setDate(renewalDate.getDate() - 30);

    await this.db
      .updateTable('contracts')
      .set({
        start_date: new Date(dto.new_start_date),
        end_date: newEndDate,
        renewal_date: renewalDate,
        amount: dto.amount !== undefined ? String(dto.amount) : contract.amount,
        status: 'active',
        updated_at: new Date(),
      })
      .where('id', '=', contractId)
      .execute();

    return renewal;
  }

  async listRenewals(contractId: string) {
    await this.checkExists(contractId);

    return this.db
      .selectFrom('contract_renewals')
      .selectAll()
      .where('contract_id', '=', contractId)
      .orderBy('renewed_at', 'desc')
      .execute();
  }

  // ── Stats ──

  async getStatsByClient(clientId: string) {
    const stats = await this.db
      .selectFrom('contracts')
      .select([
        this.db.fn.countAll<number>().as('total'),
        this.db.fn
          .countAll<number>()
          .filterWhere('status', '=', 'active')
          .as('active'),
        this.db.fn
          .countAll<number>()
          .filterWhere('status', '=', 'expiring')
          .as('expiring'),
        this.db.fn
          .countAll<number>()
          .filterWhere('status', '=', 'expired')
          .as('expired'),
      ])
      .where('client_id', '=', clientId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    return {
      total: Number(stats?.total ?? 0),
      active: Number(stats?.active ?? 0),
      expiring: Number(stats?.expiring ?? 0),
      expired: Number(stats?.expired ?? 0),
    };
  }

  async getExpiringContracts(days: number = 30) {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);

    return this.db
      .selectFrom('contracts')
      .innerJoin('clients', 'clients.id', 'contracts.client_id')
      .select([
        'contracts.id',
        'contracts.contract_number',
        'contracts.label',
        'contracts.end_date',
        'contracts.renewal_date',
        'contracts.amount',
        'contracts.currency',
        'contracts.auto_renew',
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

  // ── Helpers ──

  /**
   * Auto-generate a contract number in the format: {client-slug}-{YYYYMM}-{XXX}
   * where XXX is a zero-padded sequential number per client per month.
   * Example: acme-corp-202606-003
   */
  private async generateContractNumber(clientId: string): Promise<string> {
    // Fetch client name
    const client = await this.db
      .selectFrom('clients')
      .select('name')
      .where('id', '=', clientId)
      .executeTakeFirst();

    if (!client) throw new NotFoundException(`Client ${clientId} not found`);

    // Slugify client name: lowercase, replace non-alphanumeric with hyphens, collapse multiples
    const slug = client.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `${slug}-${yearMonth}-`;

    // Find the highest existing serial for this client + month
    const latest = await this.db
      .selectFrom('contracts')
      .select('contract_number')
      .where('client_id', '=', clientId)
      .where('contract_number', 'like', `${prefix}%`)
      .where('deleted_at', 'is', null)
      .orderBy('contract_number', 'desc')
      .limit(1)
      .executeTakeFirst();

    let nextSerial = 1;
    if (latest?.contract_number) {
      const parts = latest.contract_number.split('-');
      const lastSerial = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSerial)) {
        nextSerial = lastSerial + 1;
      }
    }

    return `${prefix}${String(nextSerial).padStart(3, '0')}`;
  }

  private async checkExists(id: string) {
    const contract = await this.db
      .selectFrom('contracts')
      .selectAll('contracts')
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!contract) throw new NotFoundException(`Contract ${id} not found`);
    return contract;
  }
}
