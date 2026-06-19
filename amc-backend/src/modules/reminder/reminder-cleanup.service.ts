import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely, sql } from 'kysely';
import { DB } from '../../db/types.generated';

@Injectable()
export class ReminderCleanupService {
  private readonly logger = new Logger(ReminderCleanupService.name);

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
  ) {}

  @Cron('0 3 * * 0')
  async cleanup() {
    this.logger.log('Cleanup job: starting');

    const deletedHistory = await this.cleanNotificationHistory();
    const deletedReminders = await this.cleanSentReminders();
    const escalated = await this.escalateOrphanedReminders();

    this.logger.log(
      `Cleanup job: complete — ${deletedHistory} history entries purged, ` +
      `${deletedReminders} old reminders deleted, ${escalated} orphaned reminders escalated`,
    );
  }

  private async cleanNotificationHistory(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const result = await this.db
      .deleteFrom('notification_history')
      .where('sent_at', '<', cutoff)
      .executeTakeFirst();

    return Number(result.numDeletedRows ?? 0);
  }

  private async cleanSentReminders(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const result = await this.db
      .deleteFrom('reminders')
      .where('status', '=', 'sent')
      .where('sent_at', '<', cutoff)
      .executeTakeFirst();

    return Number(result.numDeletedRows ?? 0);
  }

  private async escalateOrphanedReminders(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const result = await this.db
      .updateTable('reminders')
      .set({ status: 'escalated' })
      .where('status', '=', 'pending')
      .where('trigger_date', '<', cutoff)
      .executeTakeFirst();

    return Number(result.numUpdatedRows ?? 0);
  }
}
