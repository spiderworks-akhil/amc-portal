import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely } from 'kysely';
import { firstValueFrom } from 'rxjs';
import { DB } from 'src/db/types.generated';
import {
  ManagerIdsDto,
  ListClientsDto,
  CreateClientDto,
  UpdateClientDto,
  CreateContactDto,
  UpdateContactDto,
  ClientSortBy,
  SortOrder,
} from './dto';

@Injectable()
export class ClientService {
  private readonly logger = new Logger(ClientService.name);
  private readonly EXTERNAL_CLIENTS_API_URL: string;

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.EXTERNAL_CLIENTS_API_URL = this.configService.get<string>(
      'EXTERNAL_CLIENTS_API_URL',
      'https://api.accounts.spiderworks.org/api/accounts',
    );
  }

  async listClients(dto: ListClientsDto) {
    const { page = 1, limit = 50, search, sort_by = ClientSortBy.NAME, sort_order = SortOrder.ASC } = dto;
    const offset = (page - 1) * limit;

    let query = this.db
      .selectFrom('clients')
      .where('deleted_at', 'is', null)
      .where('is_active', '=', true);

    if (search) {
      const pattern = `%${search}%`;
      query = query.where((eb) => eb.or([
        eb('name', 'ilike', pattern),
        eb('company', 'ilike', pattern),
        eb('email', 'ilike', pattern),
      ]));
    }

    const [{ total }, data] = await Promise.all([
      query
        .select(this.db.fn.countAll<number>().as('total'))
        .executeTakeFirst()
        .then((r) => ({ total: Number(r?.total ?? 0) })),
      query
        .clearSelect()
        .select([
          'clients.id',
          'clients.name',
          'clients.company',
          'clients.email',
          'clients.is_active',
        ])
        .orderBy(sort_by, sort_order)
        .limit(limit)
        .offset(offset)
        .execute(),
    ]);

    let enriched = data;

    if (data.length > 0) {
      const clientIds = data.map((c) => c.id);
      const [managers, assetCounts] = await Promise.all([
        this.db
          .selectFrom('client_account_managers')
          .innerJoin('users', 'users.id', 'client_account_managers.manager_id')
          .select([
            'client_account_managers.client_id',
            'users.name',
          ])
          .where('client_account_managers.client_id', 'in', clientIds)
          .where('client_account_managers.deleted_at', 'is', null)
          .execute(),
        this.db
          .selectFrom('assets')
          .select([
            'assets.client_id',
            this.db.fn.countAll<number>().as('asset_count'),
          ])
          .where('assets.client_id', 'in', clientIds)
          .where('assets.deleted_at', 'is', null)
          .groupBy('assets.client_id')
          .execute(),
      ]);

      const managerMap = new Map<string, { count: number; names: string[] }>();
      for (const m of managers) {
        let entry = managerMap.get(m.client_id);
        if (!entry) {
          entry = { count: 0, names: [] };
          managerMap.set(m.client_id, entry);
        }
        entry.count++;
        if (entry.names.length < 3) entry.names.push(m.name);
      }

      const assetMap = new Map(assetCounts.map((row) => [row.client_id, Number(row.asset_count ?? 0)] as const));

      enriched = data.map((c) => ({
        ...c,
        manager_count: managerMap.get(c.id)?.count ?? 0,
        manager_names: managerMap.get(c.id)?.names ?? [],
        asset_count: assetMap.get(c.id) ?? 0,
      }));
    }

    return {
      data: enriched,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getClient(id: string) {
    const client = await this.db
      .selectFrom('clients')
      .selectAll('clients')
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!client) throw new NotFoundException(`Client ${id} not found`);

    const [accountManagers, contacts] = await Promise.all([
      this.db
        .selectFrom('client_account_managers')
        .innerJoin('users', 'users.id', 'client_account_managers.manager_id')
        .select([
          'users.id',
          'users.name',
          'users.email',
        ])
        .where('client_account_managers.client_id', '=', id)
        .where('client_account_managers.deleted_at', 'is', null)
        .execute(),
      this.db
        .selectFrom('client_contacts')
        .selectAll('client_contacts')
        .where('client_id', '=', id)
        .execute(),
    ]);

    return { ...client, accountManagers, contacts };
  }

  async createClient(dto: CreateClientDto) {
    const client = await this.db
      .insertInto('clients')
      .values(dto)
      .returningAll()
      .executeTakeFirst();

    return client;
  }

  async updateClient(id: string, dto: UpdateClientDto) {
    await this.checkExists(id);

    const client = await this.db
      .updateTable('clients')
      .set({ ...dto, updated_at: new Date() })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    return client;
  }

  async deleteClient(id: string) {
    await this.checkExists(id);

    await this.db
      .updateTable('clients')
      .set({ deleted_at: new Date(), is_active: false })
      .where('id', '=', id)
      .execute();

    return { message: 'Client deleted successfully' };
  }

  async addAccountManagers(clientId: string, dto: ManagerIdsDto) {
    await this.checkExists(clientId);

    const rows = dto.manager_ids.map((manager_id) => ({ client_id: clientId, manager_id }));

    const result = await this.db
      .insertInto('client_account_managers')
      .values(rows)
      .onConflict((oc) => oc.columns(['client_id', 'manager_id']).doNothing())
      .execute();

    return { inserted: Number(result[0]?.numInsertedOrUpdatedRows ?? 0) };
  }

  async removeAccountManagers(clientId: string, dto: ManagerIdsDto) {
    await this.checkExists(clientId);

    const result = await this.db
      .deleteFrom('client_account_managers')
      .where('client_id', '=', clientId)
      .where('manager_id', 'in', dto.manager_ids)
      .execute();

    return { deleted: Number(result[0]?.numDeletedRows ?? 0) };
  }

  async addContact(clientId: string, dto: CreateContactDto) {
    await this.checkExists(clientId);

    const contact = await this.db
      .insertInto('client_contacts')
      .values({ ...dto, client_id: clientId })
      .returningAll()
      .executeTakeFirst();

    return contact;
  }

  async updateContact(contactId: string, dto: UpdateContactDto) {
    const contact = await this.db
      .selectFrom('client_contacts')
      .selectAll()
      .where('id', '=', contactId)
      .executeTakeFirst();

    if (!contact) throw new NotFoundException(`Contact ${contactId} not found`);

    const updated = await this.db
      .updateTable('client_contacts')
      .set(dto)
      .where('id', '=', contactId)
      .returningAll()
      .executeTakeFirst();

    return updated;
  }

  async deleteContact(contactId: string) {
    const contact = await this.db
      .selectFrom('client_contacts')
      .select('id')
      .where('id', '=', contactId)
      .executeTakeFirst();

    if (!contact) throw new NotFoundException(`Contact ${contactId} not found`);

    await this.db
      .deleteFrom('client_contacts')
      .where('id', '=', contactId)
      .execute();

    return { message: 'Contact deleted successfully' };
  }

  // async importClientsFromApi(token: string) {
  //   const allExternalClients = await this.fetchAllExternalClients(token);

  //   if (allExternalClients.length === 0) {
  //     this.logger.warn('No clients returned from external API. Skipping sync.');
  //     return {
  //       message: 'No clients returned from external API. Sync skipped.',
  //       summary: { imported: 0, updated: 0, softDeleted: 0, skipped: 0 },
  //     };
  //   }

  //   const externalIds = new Set(allExternalClients.map((c) => String(c.id)));

  //   const result = await this.db.transaction().execute(async (trx) => {
  //     let imported = 0;
  //     let updated = 0;
  //     let skipped = 0;

  //     for (const client of allExternalClients) {
  //       try {
  //         const externalId = String(client.id);
  //         const now = new Date();
  //         const createdAt = this.isValidDate(client.created_at) ? new Date(client.created_at) : now;
  //         const updatedAt = this.isValidDate(client.updated_at) ? new Date(client.updated_at) : now;

  //         const existing = await trx
  //           .selectFrom('clients')
  //           .select(['id'])
  //           .where('external_id', '=', externalId)
  //           .executeTakeFirst();

  //         if (existing) {
  //           await trx
  //             .updateTable('clients')
  //             .set({
  //               name: client.client_name,
  //               is_active: client.is_active ?? true,
  //               updated_at: updatedAt,
  //             })
  //             .where('id', '=', existing.id)
  //             .execute();
  //           updated++;
  //         } else {
  //           await trx
  //             .insertInto('clients')
  //             .values({
  //               external_id: externalId,
  //               name: client.client_name,
  //               is_active: client.is_active ?? true,
  //               created_at: createdAt,
  //               updated_at: updatedAt,
  //             })
  //             .execute();
  //           imported++;
  //         }
  //       } catch (error) {
  //         this.logger.error(`Failed to upsert client with external ID ${client?.id}`, error.data);
  //         skipped++;
  //       }
  //     }

  //     const softDeleted = await this.reconcileDeletedClients(trx, externalIds, new Date());

  //     return { imported, updated, skipped, softDeleted };
  //   });

  //   this.logger.log(
  //     `Client reconciliation complete. Imported: ${result.imported}, Updated: ${result.updated}, Soft-deleted: ${result.softDeleted}, Skipped: ${result.skipped}`,
  //   );

  //   return {
  //     message: 'Client reconciliation completed.',
  //     summary: {
  //       totalFetched: allExternalClients.length,
  //       imported: result.imported,
  //       updated: result.updated,
  //       softDeleted: result.softDeleted,
  //       skipped: result.skipped,
  //     },
  //   };
  // }

  private async fetchAllExternalClients(token: string): Promise<any[]> {
    const allClients: any[] = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const response = await firstValueFrom(
        this.httpService.get(`${this.EXTERNAL_CLIENTS_API_URL}?page=${page}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        }),
      );

      const { data: clients, current_page, last_page } = response.data?.data || {};

      if (!Array.isArray(clients)) {
        this.logger.error(`Invalid clients structure on page ${page}`, response.data);
        break;
      }

      allClients.push(...clients);
      hasNextPage = current_page < last_page;
      if (hasNextPage) page++;
    }

    return allClients;
  }

  private async reconcileDeletedClients(
    trx: Kysely<DB>,
    externalIds: Set<string>,
    now: Date,
  ): Promise<number> {
    const localExternalClients = await trx
      .selectFrom('clients')
      .select(['id', 'external_id'])
      .where('external_id', 'is not', null)
      .where('deleted_at', 'is', null)
      .execute();

    const toDelete = localExternalClients
      .filter((c) => c.external_id && !externalIds.has(c.external_id))
      .map((c) => c.id);

    if (toDelete.length === 0) return 0;

    await trx
      .updateTable('clients')
      .set({ deleted_at: now, is_active: false })
      .where('id', 'in', toDelete)
      .execute();

    this.logger.log(`Soft-deleted ${toDelete.length} client(s) no longer in external source.`);
    return toDelete.length;
  }

  private async checkExists(id: string) {
    const client = await this.db
      .selectFrom('clients')
      .select('id')
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!client) throw new NotFoundException(`Client ${id} not found`);
    return client;
  }

  private isValidDate(value: any): boolean {
    if (!value || typeof value !== 'string') return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
}
