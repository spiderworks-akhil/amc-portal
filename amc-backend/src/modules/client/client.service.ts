import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ClientService {
  private readonly EXTERNAL_CLIENTS_API_URL =
    'https://api.accounts.spiderworks.org/api/accounts';
  private apiToken = 'tMPDDnTB7PmwVADE2c0TaXv95JDyGYtjplNfmSfq';
  constructor(
    private readonly httpService: HttpService,
  ) {}
  async importClientsFromApi(token: string) {
    let page = 1;
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let hasNextPage = true;

    // while (hasNextPage) {
    //   try {
    //     const response = await firstValueFrom(
    //       this.httpService.get(
    //         `${this.EXTERNAL_CLIENTS_API_URL}?page=${page}`,
    //         {
    //           headers: {
    //             Authorization: `Bearer ${token}`,
    //             Accept: 'application/json'
    //           }
    //         }
    //       )
    //     );

    //     const {
    //       data: clients,
    //       current_page,
    //       last_page
    //     } = response.data?.data || {};

    //     if (!Array.isArray(clients)) {
    //       this.logger.error(
    //         'Invalid clients structure received from external API.',
    //         response.data
    //       );
    //       break;
    //     }

    //     for (const client of clients) {
    //       // console.log('clients', client);
    //       try {
    //         const clientId = BigInt(client?.id);

    //         const exists = await this.prisma.clients.findUnique({
    //           where: { id: clientId }
    //         });

    //         const clientData = {
    //           clientName: client.client_name,
    //           countryId: client.country_id ? client.country_id : null,
    //           isActive: client.is_active,
    //           thumbnail: client.logo_file_name,
    //           createdAt: this.isValidDate(client.created_at)
    //             ? new Date(client.created_at)
    //             : new Date(),
    //           updatedAt: this.isValidDate(client.updated_at)
    //             ? new Date(client.updated_at)
    //             : new Date()
    //         };

    //         if (exists) {
    //           // Update existing client
    //           await this.prisma.clients.update({
    //             where: { id: clientId },
    //             data: clientData
    //           });
    //           updated++;
    //           continue;
    //         }

    //         // Create new client
    //         await this.prisma.clients.create({
    //           data: {
    //             id: clientId,
    //             ...clientData
    //           }
    //         });

    //         imported++;
    //       } catch (error) {
    //         this.logger.error(
    //           `Failed to import/update client with ID ${client?.id}`,
    //           error
    //         );
    //         skipped++;
    //       }
    //     }

    //     hasNextPage = current_page < last_page;
    //     if (hasNextPage) {
    //       page++;
    //     }
    //   } catch (error) {
    //     this.logger.error(
    //       `Failed to fetch/sync clients on page ${page}`,
    //       error
    //     );
    //     throw error;
    //   }
    // }

    // this.logger.log(
    //   `✅ Clients sync completed. Imported: ${imported}, Updated: ${updated}, Skipped: ${skipped}`
    // );
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
