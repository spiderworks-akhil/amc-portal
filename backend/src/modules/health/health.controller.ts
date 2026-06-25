import { Controller, Get, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely, sql } from 'kysely';
import { DB } from '../../db/types.generated';
import { RedisService } from '../../redis/redis.service';
import { Public } from '../auth/decorators/public.decorator';

@SkipThrottle()
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startTime = Date.now();

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
    private readonly redisService: RedisService,
  ) {}

  @Public()
  @Get()
  async check() {
    let dbStatus: 'connected' | 'error' = 'connected';
    let dbError: string | null = null;
    let redisStatus: 'connected' | 'error' = 'connected';
    let redisError: string | null = null;

    // Check PostgreSQL connectivity
    try {
      const result = await sql<{ ok: number }>`SELECT 1 AS ok`.execute(this.db);
      if (Number(result.rows[0]?.ok) !== 1) {
        throw new Error('Database returned unexpected result');
      }
    } catch (err) {
      dbStatus = 'error';
      dbError = err instanceof Error ? err.message : 'Unknown database error';
      this.logger.error(`Health check — DB error: ${dbError}`);
    }

    // Check Redis connectivity
    try {
      const client = this.redisService.getClient();
      const pong = await client.ping();
      if (pong !== 'PONG') {
        throw new Error('Redis ping did not return PONG');
      }
    } catch (err) {
      redisStatus = 'error';
      redisError = err instanceof Error ? err.message : 'Unknown Redis error';
      this.logger.error(`Health check — Redis error: ${redisError}`);
    }

    const overallStatus = dbStatus === 'connected' && redisStatus === 'connected' ? 'ok' : 'degraded';

    return {
      status: overallStatus,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: dbStatus,
          ...(dbError ? { error: dbError } : {}),
        },
        redis: {
          status: redisStatus,
          ...(redisError ? { error: redisError } : {}),
        },
      },
    };
  }
}
