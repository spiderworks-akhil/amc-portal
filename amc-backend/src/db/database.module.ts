import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { KyselyModule } from "nestjs-kysely";
import { Pool } from "pg";
import { PostgresDialect } from "kysely";

@Module({
  imports: [
    KyselyModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        dialect: new PostgresDialect({
          pool: new Pool({
            host: config.get("DB_HOST"),
            port: config.get<number>("DB_PORT"),
            user: config.get("DB_USER"),
            password: config.get("DB_PASSWORD"),
            database: config.get("DB_NAME"),
          }),
        }),
      }),
    }),
  ],
  exports: [KyselyModule],
})
export class DatabaseModule {}
