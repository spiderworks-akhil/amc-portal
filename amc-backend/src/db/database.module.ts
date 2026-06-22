import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { KyselyModule } from "nestjs-kysely";
import { Pool, type PoolConfig } from "pg";
import { PostgresDialect } from "kysely";

@Module({
  imports: [
    KyselyModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const poolConfig: PoolConfig = {
          host: config.get("DB_HOST"),
          port: config.get<number>("DB_PORT"),
          user: config.get("DB_USER"),
          password: config.get("DB_PASSWORD"),
          database: config.get("DB_NAME"),

          // ── Connection pool sizing ──
          max: config.get<number>("DB_POOL_MAX") ?? 20,

          // ── Timeouts to prevent hangs ──
          connectionTimeoutMillis: config.get<number>("DB_CONNECTION_TIMEOUT") ?? 5_000,
          idleTimeoutMillis: config.get<number>("DB_IDLE_TIMEOUT") ?? 30_000,

          // ── Connection recycling ──
          // After 7500 queries, the connection is discarded and a fresh one
          // is created.  This prevents memory leaks from accumulated
          // prepared-statements and client-side cursor state.
          maxUses: config.get<number>("DB_POOL_MAX_USES") ?? 7_500,

          // ── Monitoring ──
          // Shows up in pg_stat_activity for easier debugging
          application_name: config.get("DB_APPLICATION_NAME") ?? "amc-portal",
        };

        return {
          dialect: new PostgresDialect({
            pool: new Pool(poolConfig),
          }),
        };
      },
    }),
  ],
  exports: [KyselyModule],
})
export class DatabaseModule {}
