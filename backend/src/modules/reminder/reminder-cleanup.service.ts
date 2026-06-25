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
    this.logger.log('Reminder cleanup job: starting');

    const sent = await this.cleanSentReminders();
    const acknowledged = await this.cleanAcknowledgedReminders();
    const escalated = await this.cleanEscalatedReminders();
    const permanentlyFailed = await this.cleanPermanentlyFailedReminders();
    const orphaned = await this.escalateOrphanedReminders();
    const history = await this.cleanNotificationHistory();

    this.logger.log(
      `Reminder cleanup: complete — sent=${sent} acknowledged=${acknowledged} ` +
      `escalated=${escalated} permanently_failed=${permanentlyFailed} ` +
      `orphaned=${orphaned} history=${history}`,
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

  /**
   * Acknowledged reminders older than 90 days — no longer actionable.
   */
  private async cleanAcknowledgedReminders(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const result = await this.db
      .deleteFrom('reminders')
      .where('status', '=', 'acknowledged')
      .where('acknowledged_at', '<', cutoff)
      .executeTakeFirst();

    return Number(result.numDeletedRows ?? 0);
  }

  /**
   * Permanently failed reminders older than 30 days — max retries exhausted, no longer recoverable.
   */
  private async cleanPermanentlyFailedReminders(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    // Find permanently failed reminders (failure_reason contains "Permanently failed") older than 30 days
    const failed = await this.db
      .selectFrom('reminders')
      .select('id')
      .where('status', '=', 'pending')
      .where('failure_reason', 'ilike', '%Permanently failed%')
      .where('created_at', '<', cutoff)
      .execute();

    if (failed.length === 0) return 0;

    const ids = failed.map((r) => r.id);

    // Delete associated notification_history first
    await this.db
      .deleteFrom('notification_history')
      .where('reminder_id', 'in', ids)
      .execute();

    // Delete the reminders themselves
    const result = await this.db
      .deleteFrom('reminders')
      .where('id', 'in', ids)
      .executeTakeFirst();

    this.logger.log(`Cleaned up ${failed.length} permanently failed reminders older than 30 days`);
    return Number(result.numDeletedRows ?? 0);
  }

  /**
   * Escalated reminders older than 90 days — flagged issues past their shelf life.
   */
  private async cleanEscalatedReminders(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const result = await this.db
      .deleteFrom('reminders')
      .where('status', '=', 'escalated')
      .where('created_at', '<', cutoff)
      .executeTakeFirst();

    return Number(result.numDeletedRows ?? 0);
  }

  private async escalateOrphanedReminders(): Promise<number> {
    const orphanCutoff = new Date();
    orphanCutoff.setDate(orphanCutoff.getDate() - 7);

    const sentCutoff = new Date();
    sentCutoff.setDate(sentCutoff.getDate() - 3);

    const result = await this.db
      .updateTable('reminders')
      .set({ status: 'escalated' })
      .where((eb) =>
        eb.or([
          eb('status', '=', 'pending').and('trigger_date', '<', orphanCutoff),
          eb('status', '=', 'sent').and('sent_at', '<', sentCutoff),
        ]),
      )
      .executeTakeFirst();

    return Number(result.numUpdatedRows ?? 0);
  }
}
