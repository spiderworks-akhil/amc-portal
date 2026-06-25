import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely } from 'kysely';
import { DB } from '../../db/types.generated';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(@InjectKysely() private readonly db: Kysely<DB>) {}

  async create(dto: CreateReminderDto) {
    const reminder = await this.db
      .insertInto('reminders')
      .values({
        rule_id: dto.rule_id ?? null,
        title: dto.title,
        message: dto.message ?? null,
        target_type: dto.target_type,
        target_id: dto.target_id,
        trigger_date: new Date(dto.trigger_date),
        channel: dto.channel,
        status: dto.status ?? 'pending',
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return reminder;
  }

  async findAll(params?: {
    page?: number;
    limit?: number;
    status?: string;
    target_type?: string;
  }) {
    const { page = 1, limit = 50, status, target_type } = params ?? {};

    let query = this.db.selectFrom('reminders').selectAll();

    if (status) {
      query = query.where('status', '=', status);
    }

    if (target_type) {
      query = query.where('target_type', '=', target_type);
    }

    const [{ count }] = await this.db
      .selectFrom('reminders')
      .select(this.db.fn.countAll<number>().as('count'))
      .execute();

    const total = Number(count);
    const offset = (page - 1) * limit;

    const data = await query
      .orderBy('trigger_date', 'asc')
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

  async findUpcoming(days: number) {
    const now = new Date();
    const end = new Date();
    end.setDate(end.getDate() + days);

    const reminders = await this.db
      .selectFrom('reminders')
      .selectAll()
      .where('status', '=', 'pending')
      .where('trigger_date', '>=', now)
      .where('trigger_date', '<=', end)
      .orderBy('trigger_date', 'asc')
      .execute();

    return { data: reminders };
  }

  async findOne(id: string) {
    const reminder = await this.db
      .selectFrom('reminders')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!reminder) {
      throw new NotFoundException(`Reminder #${id} not found`);
    }

    return reminder;
  }

  async update(id: string, dto: UpdateReminderDto) {
    await this.findOne(id);

    const values: Record<string, unknown> = {};

    if (dto.rule_id !== undefined) values.rule_id = dto.rule_id;
    if (dto.title !== undefined) values.title = dto.title;
    if (dto.message !== undefined) values.message = dto.message;
    if (dto.target_type !== undefined) values.target_type = dto.target_type;
    if (dto.target_id !== undefined) values.target_id = dto.target_id;
    if (dto.trigger_date !== undefined) {
      values.trigger_date = new Date(dto.trigger_date);
    }
    if (dto.channel !== undefined) values.channel = dto.channel;
    if (dto.status !== undefined) values.status = dto.status;

    const reminder = await this.db
      .updateTable('reminders')
      .set(values)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return reminder;
  }

  async acknowledge(id: string) {
    await this.findOne(id);

    const reminder = await this.db
      .updateTable('reminders')
      .set({
        status: 'acknowledged',
        acknowledged_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return reminder;
  }

  async escalate(id: string) {
    await this.findOne(id);

    const reminder = await this.db
      .updateTable('reminders')
      .set({ status: 'escalated' })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return reminder;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.db.deleteFrom('reminders').where('id', '=', id).execute();

    return { message: `Reminder #${id} deleted` };
  }
}
