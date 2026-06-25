import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely } from 'kysely';
import { DB } from '../../../db/types.generated';
import { CreateReminderRuleDto } from './dto/create-reminder-rule.dto';
import { UpdateReminderRuleDto } from './dto/update-reminder-rule.dto';

@Injectable()
export class ReminderRulesService {
  private readonly logger = new Logger(ReminderRulesService.name);

  constructor(@InjectKysely() private readonly db: Kysely<DB>) {}

  async create(dto: CreateReminderRuleDto) {
    const rule = await this.db
      .insertInto('reminder_rules')
      .values({
        name: dto.name,
        event_type: dto.event_type,
        trigger_days: JSON.stringify(dto.trigger_days),
        channels: JSON.stringify(dto.channels),
        recipients: (dto.recipients ?? null) as never,
        enabled: dto.enabled ?? true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return rule;
  }

  async findAll(enabled?: string) {
    let query = this.db.selectFrom('reminder_rules').selectAll();

    if (enabled !== undefined) {
      query = query.where('enabled', '=', enabled === 'true');
    }

    query = query.orderBy('created_at', 'desc');

    const rules = await query.execute();
    return { data: rules };
  }

  async findOne(id: string) {
    const rule = await this.db
      .selectFrom('reminder_rules')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!rule) {
      throw new NotFoundException(`Reminder rule #${id} not found`);
    }

    return rule;
  }

  async update(id: string, dto: UpdateReminderRuleDto) {
    await this.findOne(id);

    const values: Record<string, unknown> = {};

    if (dto.name !== undefined) values.name = dto.name;
    if (dto.event_type !== undefined) values.event_type = dto.event_type;
    if (dto.trigger_days !== undefined) {
      values.trigger_days = JSON.stringify(dto.trigger_days);
    }
    if (dto.channels !== undefined) {
      values.channels = JSON.stringify(dto.channels);
    }
    if (dto.recipients !== undefined) values.recipients = dto.recipients;
    if (dto.enabled !== undefined) values.enabled = dto.enabled;

    const rule = await this.db
      .updateTable('reminder_rules')
      .set(values)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return rule;
  }

  async findActiveByEventType(eventType: string) {
    const rules = await this.db
      .selectFrom('reminder_rules')
      .selectAll()
      .where('event_type', '=', eventType)
      .where('enabled', '=', true)
      .orderBy('created_at', 'desc')
      .execute();

    return { data: rules };
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.db.deleteFrom('reminder_rules').where('id', '=', id).execute();

    return { message: `Reminder rule #${id} deleted` };
  }
}
