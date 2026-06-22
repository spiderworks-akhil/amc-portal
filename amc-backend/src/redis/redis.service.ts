import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, RedisClientType } from "redis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    this.client = createClient({
      socket: {
        host: this.configService.get<string>("redis.host"),
        port: this.configService.get<number>("redis.port"),
      },
      password: this.configService.get<string>("redis.password"),
    });
  }

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient() {
    return this.client;
  }

  /**
   * Fetch a cached value by key. Returns null if not found or on error.
   */
  async cacheGet<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Cache GET error for "${key}": ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }

  /**
   * Store a value in cache with a TTL (seconds). Serializes to JSON.
   */
  async cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.client.set(key, serialized, { EX: ttlSeconds });
    } catch (err) {
      this.logger.warn(`Cache SET error for "${key}": ${err instanceof Error ? err.message : err}`);
    }
  }

  /**
   * Delete a cache key.
   */
  async cacheDel(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(`Cache DEL error for "${key}": ${err instanceof Error ? err.message : err}`);
    }
  }

  /**
   * Build a namespaced cache key.
   */
  static cacheKey(namespace: string, ...parts: (string | undefined)[]): string {
    const joined = [namespace, ...parts.filter(Boolean)].join(':');
    return `cache:${joined}`;
  }

  /**
   * Invalidate all dashboard cache keys. Called by CacheInvalidationInterceptor
   * whenever a write operation affects dashboard-relevant entities.
   */
  async bustDashboardCache(): Promise<void> {
    try {
      const pattern = 'cache:dashboard:*';
      let cursor = '0';
      const keysToDelete: string[] = [];

      do {
        const result = await this.client.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = String(result.cursor);
        keysToDelete.push(...result.keys);
      } while (cursor !== '0');

      if (keysToDelete.length > 0) {
        await this.client.del(keysToDelete);
        this.logger.log(`Busted ${keysToDelete.length} dashboard cache keys`);
      }
    } catch (err) {
      this.logger.warn(`Failed to bust dashboard cache: ${err instanceof Error ? err.message : err}`);
    }
  }
}