import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely, sql } from 'kysely';
import { DB } from '../../db/types.generated';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { AUDIT_LOG_KEY, AuditLogConfig } from '../decorators/audit-log.decorator';

const TABLE_MAP: Record<string, string> = {
  client: 'clients',
  asset: 'assets',
  contract: 'contracts',
  domain: 'domains',
  ssl: 'ssl_certificates',
  server: 'servers',
  provider: 'service_providers',
  monitor: 'monitors',
  incident: 'incidents',
  user: 'users',
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
    @InjectKysely() private readonly db: Kysely<DB>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const config = this.reflector.get<AuditLogConfig>(AUDIT_LOG_KEY, context.getHandler());
    if (!config) return next.handle();

    const request = context.switchToHttp().getRequest();
    const method = request.method;
    if (method === 'GET') return next.handle();

    const entityType = config.entityType;
    const idParam = config.idParam ?? 'id';
    const entityId = request.params?.[idParam];
    const actorId = request.user?.id ?? null;
    const ip = request.ip ?? request.headers?.['x-forwarded-for'] ?? null;
    const tableName = TABLE_MAP[entityType];

    // Start the "before" query immediately (runs in parallel with the handler)
    const beforePromise = this.fetchBeforeState(tableName, entityId, method);

    return next.handle().pipe(
      tap({
        next: async (responseBody: unknown) => {
          try {
            const beforeState = await beforePromise;
            const wrapped = responseBody as Record<string, unknown> | null;
            const rawData = wrapped?.data ?? wrapped;

            let afterData: Record<string, unknown> | null = null;
            let resolvedId = entityId;

            if (method === 'POST') {
              afterData = rawData as Record<string, unknown> | null;
              resolvedId = resolvedId || (afterData?.id as string) ?? null;
            } else if (method === 'PUT' || method === 'PATCH') {
              afterData = rawData as Record<string, unknown> | null;
            }

            if (!resolvedId) return;

            await this.auditLogService.create({
              actor_id: actorId,
              entity_type: entityType,
              entity_id: resolvedId,
              action: this.getAction(method),
              before: beforeState ?? undefined,
              after: afterData ?? undefined,
              ip: ip as string | undefined,
            });
          } catch (err) {
            console.error('[AuditLog] Failed:', err instanceof Error ? err.message : err);
          }
        },
        error: () => {
          // On handler error, don't write an audit log
        },
      }),
    );
  }

  private async fetchBeforeState(
    tableName: string | undefined,
    entityId: string | undefined,
    method: string,
  ): Promise<Record<string, unknown> | null> {
    if (!tableName || !entityId) return null;
    if (method === 'POST') return null; // No "before" state for creates

    try {
      const rows = await sql<{ row_to_json: Record<string, unknown> }[]>`
        SELECT row_to_json(${sql.raw(tableName)}.*) as row_to_json
        FROM ${sql.raw(tableName)}
        WHERE id = ${entityId}::uuid
      `.execute(this.db);

      return rows[0]?.row_to_json ?? null;
    } catch {
      return null;
    }
  }

  private getAction(method: string): string {
    switch (method) {
      case 'POST': return 'create';
      case 'PUT':
      case 'PATCH': return 'update';
      case 'DELETE': return 'delete';
      default: return method.toLowerCase();
    }
  }
}
