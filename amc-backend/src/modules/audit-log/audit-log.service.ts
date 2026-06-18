import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely, sql } from 'kysely';
import { DB } from '../../db/types.generated';
import { CreateAuditLogDto, ListAuditLogsDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
  ) {}

  async create(dto: CreateAuditLogDto) {
    const log = await this.db
      .insertInto('audit_logs')
      .values({
        actor_id: dto.actor_id ?? null,
        entity_type: dto.entity_type,
        entity_id: dto.entity_id,
        action: dto.action,
        before: dto.before ? JSON.stringify(dto.before) : null,
        after: dto.after ? JSON.stringify(dto.after) : null,
        ip: dto.ip ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    this.logger.log(`Audit log created: ${dto.action} ${dto.entity_type} ${dto.entity_id}`);
    return log;
  }

  async list(dto: ListAuditLogsDto) {
    const {
      page = 1,
      limit = 50,
      entity_type,
      entity_id,
      action,
      actor_id,
      date_from,
      date_to,
    } = dto;
    const offset = (page - 1) * limit;

    let baseQuery = this.db
      .selectFrom('audit_logs')
      .leftJoin('users', 'users.id', 'audit_logs.actor_id');

    let countQuery = this.db
      .selectFrom('audit_logs')
      .select(this.db.fn.countAll<number>().as('total'));

    if (entity_type && entity_type !== 'all') {
      baseQuery = baseQuery.where('audit_logs.entity_type', '=', entity_type);
      countQuery = countQuery.where('audit_logs.entity_type', '=', entity_type);
    }

    if (entity_id) {
      baseQuery = baseQuery.where('audit_logs.entity_id', '=', entity_id);
      countQuery = countQuery.where('audit_logs.entity_id', '=', entity_id);
    }

    if (action && action !== 'all') {
      baseQuery = baseQuery.where('audit_logs.action', '=', action);
      countQuery = countQuery.where('audit_logs.action', '=', action);
    }

    if (actor_id) {
      baseQuery = baseQuery.where('audit_logs.actor_id', '=', actor_id);
      countQuery = countQuery.where('audit_logs.actor_id', '=', actor_id);
    }

    if (date_from) {
      baseQuery = baseQuery.where('audit_logs.created_at', '>=', new Date(date_from));
      countQuery = countQuery.where('audit_logs.created_at', '>=', new Date(date_from));
    }

    if (date_to) {
      baseQuery = baseQuery.where('audit_logs.created_at', '<=', new Date(date_to));
      countQuery = countQuery.where('audit_logs.created_at', '<=', new Date(date_to));
    }

    const [{ total }, data] = await Promise.all([
      countQuery.executeTakeFirst().then((r) => ({ total: Number(r?.total ?? 0) })),
      baseQuery
        .select([
          'audit_logs.id',
          'audit_logs.actor_id',
          'audit_logs.entity_type',
          'audit_logs.entity_id',
          'audit_logs.action',
          'audit_logs.before',
          'audit_logs.after',
          'audit_logs.ip',
          'audit_logs.created_at',
          'users.name as actor_name',
          'users.email as actor_email',
        ])
        .orderBy('audit_logs.created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute(),
    ]);

    // Parse JSON fields
    const parsed = data.map((row) => ({
      ...row,
      before: row.before ? this.tryParseJson(row.before as string) : null,
      after: row.after ? this.tryParseJson(row.after as string) : null,
    }));

    return {
      data: parsed,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const log = await this.db
      .selectFrom('audit_logs')
      .leftJoin('users', 'users.id', 'audit_logs.actor_id')
      .select([
        'audit_logs.id',
        'audit_logs.actor_id',
        'audit_logs.entity_type',
        'audit_logs.entity_id',
        'audit_logs.action',
        'audit_logs.before',
        'audit_logs.after',
        'audit_logs.ip',
        'audit_logs.created_at',
        'users.name as actor_name',
        'users.email as actor_email',
      ])
      .where('audit_logs.id', '=', id)
      .executeTakeFirst();

    if (!log) throw new NotFoundException(`Audit log ${id} not found`);

    return {
      ...log,
      before: log.before ? this.tryParseJson(log.before as string) : null,
      after: log.after ? this.tryParseJson(log.after as string) : null,
    };
  }

  async getRecent(limit = 20) {
    const logs = await this.db
      .selectFrom('audit_logs')
      .leftJoin('users', 'users.id', 'audit_logs.actor_id')
      .select([
        'audit_logs.id',
        'audit_logs.actor_id',
        'audit_logs.entity_type',
        'audit_logs.entity_id',
        'audit_logs.action',
        'audit_logs.before',
        'audit_logs.after',
        'audit_logs.created_at',
        'users.name as actor_name',
      ])
      .orderBy('audit_logs.created_at', 'desc')
      .limit(limit)
      .execute();

    return logs.map((log) => ({
      ...log,
      before: log.before ? this.tryParseJson(log.before as string) : null,
      after: log.after ? this.tryParseJson(log.after as string) : null,
    }));
  }

  private tryParseJson(value: string): Record<string, unknown> | null {
    if (!value) return null;
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
