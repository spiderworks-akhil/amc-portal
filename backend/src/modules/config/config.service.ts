import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely } from 'kysely';
import { DB } from '../../db/types.generated';
import {
  UpdateSmtpConfigDto,
  UpdateWhatsAppConfigDto,
} from './dto';

const CONFIG_GROUPS = ['smtp', 'whatsapp'] as const;
export type ConfigGroup = (typeof CONFIG_GROUPS)[number];

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
  ) {}

  async getConfig(group: ConfigGroup) {
    const row = await this.db
      .selectFrom('app_configs')
      .selectAll()
      .where('group', '=', group)
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundException(`Config group "${group}" not found`);
    }

    return row;
  }

  async updateSmtp(dto: UpdateSmtpConfigDto, userId: string) {
    return this.upsert('smtp', dto as unknown as Record<string, unknown>, userId);
  }

  async updateWhatsApp(dto: UpdateWhatsAppConfigDto, userId: string) {
    return this.upsert('whatsapp', dto as unknown as Record<string, unknown>, userId);
  }

  private async upsert(
    group: string,
    config: Record<string, unknown>,
    userId: string,
  ) {
    const now = new Date();

    const existing = await this.db
      .selectFrom('app_configs')
      .select('id')
      .where('group', '=', group)
      .executeTakeFirst();

    if (existing) {
      await this.db
        .updateTable('app_configs')
        .set({
          config: config as never,
          updated_by_id: userId,
          updated_at: now,
        })
        .where('id', '=', existing.id)
        .execute();
    } else {
      await this.db
        .insertInto('app_configs')
        .values({
          group,
          config: config as never,
          updated_by_id: userId,
          updated_at: now,
        })
        .execute();
    }

    this.logger.log(`Config group "${group}" updated by user ${userId}`);

    return this.db
      .selectFrom('app_configs')
      .selectAll()
      .where('group', '=', group)
      .executeTakeFirst();
  }
}
