import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely } from 'kysely';
import { firstValueFrom } from 'rxjs';
import { DB } from 'src/db/types.generated';
import { RedisService } from '../../redis/redis.service';
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

  private static readonly EXTERNAL_CLIENTS_TTL = 300; // 5 minutes

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.EXTERNAL_CLIENTS_API_URL = this.configService.get<string>(
      'EXTERNAL_CLIENTS_API_URL',
      'https://api.accounts.spiderworks.org/api/accounts',
    );
  }

  async listClients(dto: ListClientsDto) {
    const {
      page = 1,
      limit = 50,
      search,
      sort_by = ClientSortBy.NAME,
      sort_order = SortOrder.ASC,
    } = dto;
    const offset = (page - 1) * limit;

    let query = this.db
      .selectFrom('clients')
      .where('deleted_at', 'is', null)
      .where('is_active', '=', true);

    if (search) {
      const pattern = `%${search}%`;
      query = query.where((eb) =>
        eb.or([
          eb('name', 'ilike', pattern),
          eb('company', 'ilike', pattern),
          eb('email', 'ilike', pattern),
        ]),
      );
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
          .select(['client_account_managers.client_id', 'users.name'])
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

      const assetMap = new Map(
        assetCounts.map(
          (row) => [row.client_id, Number(row.asset_count ?? 0)] as const,
        ),
      );

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
        .select(['users.id', 'users.name', 'users.email'])
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

  async createClient(dto: CreateClientDto, userId: string) {
    const existing = await this.db
      .selectFrom('clients')
      .select(['id'])
      .where('external_id', '=', dto.external_id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (existing) {
      throw new BadRequestException(
        `Client with external ID "${dto.external_id}" already exists`,
      );
    }

    const client = await this.db
      .insertInto('clients')
      .values({ ...dto, created_by: userId, updated_by: userId })
      .returningAll()
      .executeTakeFirst();

    return client;
  }

  async updateClient(id: string, dto: UpdateClientDto, userId: string) {
    await this.checkExists(id);

    const client = await this.db
      .updateTable('clients')
      .set({ ...dto, updated_by: userId, updated_at: new Date() })
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

    const rows = dto.manager_ids.map((manager_id) => ({
      client_id: clientId,
      manager_id,
    }));

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
      .values({
        ...dto,
        client_id: clientId,
        should_send_notification: dto.should_send_notification ?? false,
        should_send_wp_notification: dto.should_send_wp_notification ?? false,
      })
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

  async listExternalClients(userId: string, query?: string): Promise<any[]> {
    const cacheKey = RedisService.cacheKey('external-clients', userId);

    // Try cache first (full list, unfiltered)
    const cached = await this.redis.cacheGet<any[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for external clients (user=${userId})`);
      if (query) {
        const q = query.toLowerCase();
        return cached.filter(
          (c: any) =>
            c.client_name?.toLowerCase().includes(q) ||
            String(c.id).includes(q) ||
            c.email?.toLowerCase().includes(q),
        );
      }
      return cached;
    }

    try {
      const clients = await this.fetchAllExternalClients(userId);

      // Store in cache — don't block the response
      this.redis
        .cacheSet(cacheKey, clients, ClientService.EXTERNAL_CLIENTS_TTL)
        .catch((err) =>
          this.logger.warn(`Failed to cache external clients: ${err.message}`),
        );

      if (query) {
        const q = query.toLowerCase();
        return clients.filter(
          (c: any) =>
            c.client_name?.toLowerCase().includes(q) ||
            String(c.id).includes(q) ||
            c.email?.toLowerCase().includes(q),
        );
      }

      return clients;
    } catch (err: any) {
      this.logger.error(
        'Failed to fetch external clients',
        err?.response?.data || err.message,
      );
      const detail =
        err.response?.status === 401
          ? 'External API authentication failed'
          : 'Unable to fetch external client accounts.';
      throw new BadRequestException(detail);
    }
  }

 private async fetchAllExternalClients(userId: string): Promise<any[]> {
  const allClients: any[] = [];

  const user = await this.db
    .selectFrom('users')
    .select(['access_token'])
    .where('id', '=', userId)
    .executeTakeFirst();

  if (!user?.access_token) {
    throw new BadRequestException(
      'External access token not found for user',
    );
  }

  let page = 1;

  while (true) {
    try {
      const params = new URLSearchParams({
        page: String(page),
      });

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.EXTERNAL_CLIENTS_API_URL}?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${user.access_token}`,
              Accept: 'application/json',
            },
          },
        ),
      );

      const payload = response.data?.data;

      const clients = payload?.data ?? [];
      const currentPage = Number(payload?.current_page ?? page);
      const lastPage = Number(payload?.last_page ?? page);

      if (!Array.isArray(clients)) {
        this.logger.error(
          `Invalid clients structure on page ${page}`,
          response.data,
        );
        break;
      }

      allClients.push(...clients);

      this.logger.log(
        `Fetched page ${currentPage}/${lastPage} (${clients.length} clients)`,
      );

      if (currentPage >= lastPage || clients.length === 0) {
        break;
      }

      page++;
    } catch (error) {
      this.logger.error(
        `Failed fetching external clients page ${page}`,
        error,
      );
      throw error;
    }
  }

  this.logger.log(
    `Fetched ${allClients.length} clients across ${page} page(s)`,
  );

  return allClients;
}


  async syncAllClients(userId: string) {
    const externalClients = await this.fetchAllExternalClients(userId);

    if (externalClients.length === 0) {
      return {
        message: 'No clients returned from external API. Sync skipped.',
        summary: { totalFetched: 0, updated: 0, skipped: 0 },
      };
    }

    const externalMap = new Map<string, any>(
      externalClients.map((c: any) => [String(c.id), c]),
    );

    const localClients = await this.db
      .selectFrom('clients')
      .select(['id', 'external_id', 'name', 'email'])
      .where('external_id', 'is not', null)
      .where('deleted_at', 'is', null)
      .execute();

    let updated = 0;
    let skipped = 0;
    let contactsSynced = 0;

    for (const local of localClients) {
      if (!local.external_id) {
        skipped++;
        continue;
      }

      const external = externalMap.get(local.external_id);
      if (!external) {
        skipped++;
        continue;
      }

      const newName = external.client_name;
      const newEmail = external.email ?? null;

      if (local.name !== newName || local.email !== newEmail) {
        await this.db
          .updateTable('clients')
          .set({ name: newName, email: newEmail, updated_at: new Date() })
          .where('id', '=', local.id)
          .execute();
        updated++;
      } else {
        skipped++;
      }
    }

    this.logger.log(
      `Sync complete: ${updated} updated, ${skipped} skipped, ${contactsSynced} contacts synced`,
    );

    return {
      message: `${updated} client(s) synced successfully`,
      summary: {
        totalFetched: externalClients.length,
        updated,
        skipped,
        contactsSynced,
      },
    };
  }

  async syncClient(id: string, userId: string) {
    const client = await this.checkExists(id);

    if (!client.external_id) {
      throw new BadRequestException(
        'This client has no external ID and cannot be synced from the external portal.',
      );
    }

    const externalClients = await this.fetchAllExternalClients(userId);
    const external = externalClients.find(
      (c: any) => String(c.id) === client.external_id,
    );

    if (!external) {
      throw new NotFoundException(
        `External account with ID ${client.external_id} not found. The client may have been deleted from the external portal.`,
      );
    }

    const newName = external.client_name;
    const newEmail = external.email ?? null;

    await this.db
      .updateTable('clients')
      .set({ name: newName, email: newEmail, updated_at: new Date() })
      .where('id', '=', id)
      .execute();

    const contactSynced = await this.syncClientContact(id, external);

    return {
      message: 'Client synced successfully',
      client: { id, name: newName, email: newEmail },
      contactsSynced: contactSynced ? 1 : 0,
    };
  }

  private async syncClientContact(
    clientId: string,
    external: any,
  ): Promise<boolean> {
    const externalName = external.contact_name;
    const externalEmail = external.email ?? null;
    const externalPhone = external.phone ?? null;

    const existing = await this.db
      .selectFrom('client_contacts')
      .select(['id', 'name', 'email', 'phone'])
      .where('client_id', '=', clientId)
      .where('is_primary', '=', true)
      .executeTakeFirst();

    if (existing) {
      if (
        existing.name === externalName &&
        existing.email === externalEmail &&
        existing.phone === externalPhone
      ) {
        return false;
      }

      await this.db
        .updateTable('client_contacts')
        .set({ name: externalName, email: externalEmail, phone: externalPhone })
        .where('id', '=', existing.id)
        .execute();

      return true;
    }

    if (!externalName) return false;

  
    return true;
  }

  private async checkExists(id: string) {
  const client = await this.db
    .selectFrom('clients')
    .select(['id', 'external_id'])
    .where('id', '=', id)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

  if (!client) {
    throw new NotFoundException(`Client ${id} not found`);
  }

  return client;
}
}

