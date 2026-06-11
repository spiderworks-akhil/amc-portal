import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely } from 'kysely';
import { firstValueFrom } from 'rxjs';
import { DB } from 'src/db/types.generated';
import { AddContactsDto, AddManagersDto, ListClientsDto, ClientSortBy, SortOrder } from './dto';

@Injectable()
export class ClientService {
  private readonly logger = new Logger(ClientService.name);
  private readonly EXTERNAL_CLIENTS_API_URL: string;

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.EXTERNAL_CLIENTS_API_URL =
      this.configService.get<string>(
        'EXTERNAL_CLIENTS_API_URL',
        'https://api.accounts.spiderworks.org/api/accounts',
      );
  }

  async listClients(dto: ListClientsDto) {
    const { page = 1, limit = 50, search, sort_by = ClientSortBy.NAME, sort_order = SortOrder.ASC } = dto;
    const offset = (page - 1) * limit;

    let query = this.db.selectFrom('clients').where('deleted_at', 'is', null);

    if (search) {
      const pattern = `%${search}%`;
      query = query.where((eb) => eb.or([
        eb('name', 'ilike', pattern),
        eb('company', 'ilike', pattern),
        eb('email', 'ilike', pattern),
      ]));
    }

    const countResult = await query
      .select(this.db.fn.countAll<number>().as('total'))
      .executeTakeFirst();
    const total = Number(countResult?.total ?? 0);

    const data = await query
      .clearSelect()
      .select(["id","name"])
      .orderBy(sort_by, sort_order)
      .limit(limit)
      .offset(offset)
      .execute();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  /**
   * Full reconciliation with external source-of-truth API.
   * 1. Fetch ALL pages from external API
   * 2. Upsert each client (matched by external_id)
   * 3. Soft-delete local clients not present in external data
   * Runs in a single transaction for atomicity.
   */
  async importClientsFromApi(token: string) {
    // Phase 1: Fetch all external clients (paginated)
    const allExternalClients = await this.fetchAllExternalClients(token);

    if (allExternalClients.length === 0) {
      this.logger.warn('No clients returned from external API. Skipping sync.');
      return {
        message: 'No clients returned from external API. Sync skipped.',
        summary: { imported: 0, updated: 0, softDeleted: 0, skipped: 0 },
      };
    }

    // Build the set of all external IDs from the source of truth
    const externalIds = new Set(allExternalClients.map((c) => String(c.id)));

    // Phase 2: Reconcile in a single transaction
    const result = await this.db.transaction().execute(async (trx) => {
      let imported = 0;
      let updated = 0;
      let skipped = 0;

      const now = new Date();

      for (const client of allExternalClients) {
        try {
          const externalId = String(client.id);
          const createdAt = this.isValidDate(client.created_at)
            ? new Date(client.created_at)
            : now;
          const updatedAt = this.isValidDate(client.updated_at)
            ? new Date(client.updated_at)
            : now;

          const existing = await trx
            .selectFrom('clients')
            .select(['id', 'external_id'])
            .where('external_id', '=', externalId)
            .executeTakeFirst();

          if (existing) {
            await trx
              .updateTable('clients')
              .set({
                name: client.client_name,
                is_active: client.is_active ?? true,
                updated_at: updatedAt,
              })
              .where('id', '=', existing.id)
              .execute();
            updated++;
          } else {
            await trx
              .insertInto('clients')
              .values({
                external_id: externalId,
                name: client.client_name,
                is_active: client.is_active ?? true,
                created_at: createdAt,
                updated_at: updatedAt,
              })
              .execute();
            imported++;
          }
        } catch (error) {
          this.logger.error(
            `Failed to upsert client with external ID ${client?.id}`,
            error,
          );
          skipped++;
        }
      }

      // Phase 3: Soft-delete local clients not in the external source of truth
      const softDeleted = await this.reconcileDeletedClients(trx, externalIds, now);

      return { imported, updated, skipped, softDeleted };
    });

    this.logger.log(
      `Client reconciliation complete. Imported: ${result.imported}, ` +
      `Updated: ${result.updated}, Soft-deleted: ${result.softDeleted}, Skipped: ${result.skipped}`,
    );

    return {
      message: 'Client reconciliation completed.',
      summary: {
        totalFetched: allExternalClients.length,
        imported: result.imported,
        updated: result.updated,
        softDeleted: result.softDeleted,
        skipped: result.skipped,
      },
    };
  }

  /**
   * Paginate through the external API and collect ALL client records.
   */
  private async fetchAllExternalClients(token: string): Promise<any[]> {
    const allClients: any[] = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.EXTERNAL_CLIENTS_API_URL}?page=${page}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          },
        ),
      );

      const { data: clients, current_page, last_page } =
        response.data?.data || {};

      if (!Array.isArray(clients)) {
        this.logger.error(
          `Invalid clients structure on page ${page}`,
          response.data,
        );
        break;
      }

      allClients.push(...clients);

      hasNextPage = current_page < last_page;
      if (hasNextPage) page++;
    }

    return allClients;
  }

  /**
   * Soft-delete local clients whose external_id is NOT in the external source-of-truth set.
   * Only touches clients with a non-null external_id and not already deleted.
   */
  private async reconcileDeletedClients(
    trx: Kysely<DB>,
    externalIds: Set<string>,
    now: Date,
  ): Promise<number> {
    // Get all active local clients that have an external_id
    const localExternalClients = await trx
      .selectFrom('clients')
      .select(['id', 'external_id'])
      .where('external_id', 'is not', null)
      .where('deleted_at', 'is', null)
      .execute();

    const toSoftDelete = localExternalClients
      .filter((c) => !externalIds.has(c.external_id!))
      .map((c) => c.id);

    if (toSoftDelete.length === 0) return 0;

    await trx
      .updateTable('clients')
      .set({ deleted_at: now, is_active: false })
      .where('id', 'in', toSoftDelete)
      .execute();

    this.logger.log(
      `Soft-deleted ${toSoftDelete.length} local client(s) no longer in external source.`,
    );

    return toSoftDelete.length;
  }
 
  async addAccountManagersToClients(dto: AddManagersDto) {
    const { client_id, manager_ids } = dto;
    await this.checkExists(client_id);

    const rows = manager_ids.map((manager_id) => ({
      client_id,
      manager_id,
    }));

    return this.db
      .insertInto('client_account_managers')
      .values(rows)
      .onConflict((oc) => oc.columns(['client_id', 'manager_id']).doNothing())
      .execute();
  }

  async addContactsToClients(dto: AddContactsDto) {
    const  {contacts} = dto

  }

  private async checkExists(clientId:string) {
    const client = await this.db.selectFrom('clients')
      .selectAll()
      .where('id', '=', clientId)
      .executeTakeFirst();
    if(!client) throw new NotFoundException(`Client does not exist with this ${clientId}`)
      return client  
  }

  private isValidDate(value: any): boolean {
    if (!value || typeof value !== 'string') return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
}
