import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely, sql } from 'kysely';
import { DB } from '../../db/types.generated';

@Injectable()
export class DashboardService {
  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
  ) {}

  async getSummary() {
    const [clientsResult, assetsResult, totalContractsResult, activeContractsResult, domainsResult] =
      await Promise.all([
        this.db
          .selectFrom('clients')
          .select(this.db.fn.countAll<number>().as('clientCount'))
          .where('deleted_at', 'is', null)
          .where('is_active', '=', true)
          .executeTakeFirst(),
        this.db
          .selectFrom('assets')
          .select(this.db.fn.countAll<number>().as('assetCount'))
          .where('deleted_at', 'is', null)
          .executeTakeFirst(),
        this.db
          .selectFrom('contracts')
          .select(this.db.fn.countAll<number>().as('totalContractCount'))
          .where('deleted_at', 'is', null)
          .executeTakeFirst(),
        this.db
          .selectFrom('contracts')
          .select(this.db.fn.countAll<number>().as('activeContractCount'))
          .where('deleted_at', 'is', null)
          .where('status', '=', 'active')
          .executeTakeFirst(),
        this.db
          .selectFrom('domains')
          .select(this.db.fn.countAll<number>().as('domainCount'))
          .executeTakeFirst(),
      ]);

    return {
      totalClients: Number(clientsResult?.clientCount ?? 0),
      totalAssets: Number(assetsResult?.assetCount ?? 0),
      totalContracts: Number(totalContractsResult?.totalContractCount ?? 0),
      activeContracts: Number(activeContractsResult?.activeContractCount ?? 0),
      totalDomains: Number(domainsResult?.domainCount ?? 0),
    };
  }
}
