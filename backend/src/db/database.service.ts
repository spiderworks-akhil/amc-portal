import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { InjectKysely } from "nestjs-kysely";
import { Kysely } from "kysely";
import { DB } from "./types.generated";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@InjectKysely() private readonly db: Kysely<DB>) {}

  async onModuleDestroy() {
    this.logger.log("Closing database connections...");
    try {
      await this.db.destroy();
      this.logger.log("Database connections closed");
    } catch (err) {
      this.logger.error(
        `Error closing database connections: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
