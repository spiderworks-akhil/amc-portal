import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { RedisService } from '../../redis/redis.service';

/**
 * Entity routes whose mutations should bust the dashboard cache.
 * When a POST/PUT/PATCH/DELETE succeeds on any of these routes, all
 * `cache:dashboard:*` keys are invalidated so the next GET loads fresh data.
 */
const DASHBOARD_AFFECTING_PREFIXES = [
  '/client',
  '/domain',
  '/ssl',
  '/contract',
  '/server',
  '/asset',
  '/monitor',
  '/incident',
  '/provider',
  '/reminder',
  '/reminder-rules',
];

@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInvalidationInterceptor.name);

  constructor(private readonly redis: RedisService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Only intercept write methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return next.handle();
    }

    // Only intercept routes that affect the dashboard
    const path: string = request.route?.path ?? request.path ?? '';
    const shouldBust = DASHBOARD_AFFECTING_PREFIXES.some(
      (prefix) => path.startsWith(prefix) || path.startsWith(`/api${prefix}`),
    );

    if (!shouldBust) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          // Fire-and-forget cache bust — never block the response
          this.redis.bustDashboardCache().catch(
            (err) => this.logger.warn(`Cache invalidation failed: ${err.message}`),
          );
        },
        error: () => {
          // Don't bust cache on failed requests
        },
      }),
    );
  }
}
