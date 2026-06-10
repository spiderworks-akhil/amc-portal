import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely, type Expression, type SqlBool, sql } from 'kysely';
import { firstValueFrom } from 'rxjs';
import { DB } from 'src/db/database.interface';

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

  async importClientsFromApi(token: string) {
    let page = 1;
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let hasNextPage = true;

    while (hasNextPage) {
      try {
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
            'Invalid clients structure received from external API.',
            response.data,
          );
          break;
        }

        for (const client of clients) {
          try {
            const externalId = String(client.id);

            const exists = await this.db
              .selectFrom('clients')
              .selectAll()
              .where(sql`custom_fields @> ${JSON.stringify({ externalId })}::jsonb` as Expression<SqlBool>)
              .executeTakeFirst();

            const now = new Date();
            const clientData = {
              name: client.client_name,
              is_active: client.is_active ?? true,
              custom_fields: {
                externalId,
                countryId: client.country_id ?? null,
              },
              updated_at: this.isValidDate(client.updated_at)
                ? new Date(client.updated_at)
                : now,
            };

            if (exists) {
              await this.db
                .updateTable('clients')
                .set(clientData)
                .where('id', '=', exists.id)
                .executeTakeFirst();
              updated++;
              continue;
            }

            await this.db
              .insertInto('clients')
              .values({
                ...clientData,
                name: client.client_name,
                is_active: client.is_active ?? true,
                tags:[],
                created_at: this.isValidDate(client.created_at)
                  ? new Date(client.created_at)
                  : now,
              })
              .executeTakeFirst();

            imported++;
          } catch (error) {
            this.logger.error(
              `Failed to import/update client with ID ${client?.id}`,
              error,
            );
            skipped++;
          }
        }

        hasNextPage = current_page < last_page;
        if (hasNextPage) {
          page++;
        }
      } catch (error) {
        this.logger.error(
          `Failed to fetch/sync clients on page ${page}`,
          error,
        );
        throw error;
      }
    }

    this.logger.log(
      `Clients sync completed. Imported: ${imported}, Updated: ${updated}, Skipped: ${skipped}`,
    );
    return {
      message: `Client sync completed. Imported: ${imported}, Updated: ${updated}, Skipped: ${skipped}`,
      summary: {
        totalFetched: imported + updated + skipped,
        imported,
        updated,
        skipped,
      },
    };
  }

  private isValidDate(value: any): boolean {
    if (!value || typeof value !== 'string') return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
}
