import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { KyselyModule } from "nestjs-kysely";
import { Pool, type PoolConfig } from "pg";
import { PostgresDialect } from "kysely";
import { DatabaseService } from "./database.service";

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
          max: config.get<number>("DB_POOL_MAX") ?? 20,
          connectionTimeoutMillis: config.get<number>("DB_CONNECTION_TIMEOUT") ?? 5_000,
          idleTimeoutMillis: config.get<number>("DB_IDLE_TIMEOUT") ?? 30_000,
          maxUses: config.get<number>("DB_POOL_MAX_USES") ?? 7_500,
          application_name: config.get("DB_APPLICATION_NAME") ?? "amc-portal",
          ssl: config.get("NODE_ENV") === "production" ? { rejectUnauthorized: false } : false,
        };

        return {
          dialect: new PostgresDialect({
            pool: new Pool(poolConfig),
          }),
        };
      },
    }),
  ],
  providers: [DatabaseService],
  exports: [KyselyModule, DatabaseService],
})
export class DatabaseModule {}
