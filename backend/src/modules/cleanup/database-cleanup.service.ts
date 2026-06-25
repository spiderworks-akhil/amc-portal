import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely, sql } from 'kysely';
import { DB } from '../../db/types.generated';
import { AuthService } from '../auth/auth.service';

/**
 * Dedicated database cleanup service that manages data retention across all
 * high-volume tables. Runs daily at 2 AM for critical/high cleanups and
 * weekly at 4 AM Sunday for low-priority purges.
 *
 * Reminder-specific cleanup (sent, acknowledged, escalated) is handled by
 * ReminderCleanupService (runs at 3 AM Sunday) — this service owns everything
 * else.
 *
 * Retention policy:
 *   Critical  — monitor_checks, revoked_tokens, domain/ssl snapshots
 *   High      — incidents (resolved), audit_logs, in_app_notifications
 *   Low       — soft-deleted entities, contract_renewals
 */
@Injectable()
export class DatabaseCleanupService {
  private readonly logger = new Logger(DatabaseCleanupService.name);

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
    private readonly authService: AuthService,
  ) {}

  // ──────────────────────────────────────────────
  //  Daily cleanup — 2:00 AM
  // ──────────────────────────────────────────────

  @Cron('0 2 * * *')
  async dailyCleanup() {
    const startedAt = Date.now();
    this.logger.log('Daily database cleanup: starting');

    const results: Record<string, number> = {};

    // Critical — high volume
    results.monitorChecks = await this.cleanMonitorChecks();
    results.expiredTokens = await this.authService.cleanupExpiredTokens();
    results.domainSnapshots = await this.cleanDomainSnapshots();
    results.sslSnapshots = await this.cleanSslSnapshots();

    // High — slow eating disk
    results.resolvedIncidents = await this.cleanResolvedIncidents();
    results.auditLogs = await this.cleanAuditLogs();

    // Medium
    results.inAppNotifications = await this.cleanInAppNotifications();

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    this.logger.log(
      `Daily database cleanup: complete in ${elapsed}s — ` +
      Object.entries(results)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}=${v}`)
        .join(', '),
    );
  }

  // ──────────────────────────────────────────────
  //  Weekly cleanup — 4:00 AM Sunday
  //  (shifted from 3 AM to avoid collision with ReminderCleanupService)
  // ──────────────────────────────────────────────

  @Cron('0 4 * * 0')
  async weeklyCleanup() {
    const startedAt = Date.now();
    this.logger.log('Weekly database cleanup: starting');

    const results: Record<string, number> = {};

    // Low — optional, low volume
    results.softDeletedEntities = await this.cleanSoftDeletedEntities();
    results.contractRenewals = await this.cleanContractRenewals();

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    this.logger.log(
      `Weekly database cleanup: complete in ${elapsed}s — ` +
      Object.entries(results)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}=${v}`)
        .join(', '),
    );
  }

  // ─── Critical ─────────────────────────────────

  /**
   * Keep 30 days of raw monitor checks. Every uptime check inserts a row,
   * so this is the #1 volume driver.
   */
  private async cleanMonitorChecks(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const result = await this.db
      .deleteFrom('monitor_checks')
      .where('checked_at', '<', cutoff)
      .executeTakeFirst();

    return Number(result.numDeletedRows ?? 0);
  }

  /**
   * Domain snapshots: keep daily for 30 days, then weekly for 1 year,
   * then purge. Uses a two-phase approach:
   * 1. Delete all snapshots older than 1 year
   * 2. For the 30d–1yr window, keep only the latest snapshot per domain per week
   */
  private async cleanDomainSnapshots(): Promise<number> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Phase 1: purge everything older than 1 year
    const phase1 = await this.db
      .deleteFrom('domain_snapshots')
      .where('checked_at', '<', oneYearAgo)
      .executeTakeFirst();

    let phase2 = 0n;

    // Phase 2: keep only the latest snapshot per domain per week in the 30d–1yr window
    const result = await sql<{ deleted: bigint }>`
      DELETE FROM domain_snapshots
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY domain_id, DATE_TRUNC('week', checked_at)
            ORDER BY checked_at DESC
          ) AS rn
          FROM domain_snapshots
          WHERE checked_at >= ${thirtyDaysAgo}
            AND checked_at < ${oneYearAgo}
        ) ranked
        WHERE rn > 1
      )
    `.execute(this.db);

    phase2 = result.rows?.[0]?.deleted ?? 0n;

    const total = Number(phase1.numDeletedRows ?? 0n) + Number(phase2);
    return total;
  }

  /**
   * Same retention policy as domain_snapshots: daily for 30d,
   * weekly for 1yr, purge beyond.
   */
  private async cleanSslSnapshots(): Promise<number> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Phase 1: purge everything older than 1 year
    const phase1 = await this.db
      .deleteFrom('ssl_snapshots')
      .where('checked_at', '<', oneYearAgo)
      .executeTakeFirst();

    let phase2 = 0n;

    // Phase 2: keep only the latest snapshot per SSL per week in the 30d–1yr window
    const result = await sql<{ deleted: bigint }>`
      DELETE FROM ssl_snapshots
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY ssl_id, DATE_TRUNC('week', checked_at)
            ORDER BY checked_at DESC
          ) AS rn
          FROM ssl_snapshots
          WHERE checked_at >= ${thirtyDaysAgo}
            AND checked_at < ${oneYearAgo}
        ) ranked
        WHERE rn > 1
      )
    `.execute(this.db);

    phase2 = result.rows?.[0]?.deleted ?? 0n;

    const total = Number(phase1.numDeletedRows ?? 0n) + Number(phase2);
    return total;
  }

  // ─── High ─────────────────────────────────────

  /**
   * Resolved incidents pile up forever. Keep resolved for 90 days,
   * then purge. Open incidents are always preserved.
   */
  private async cleanResolvedIncidents(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const result = await this.db
      .deleteFrom('incidents')
      .where('resolved_at', 'is not', null)
      .where('resolved_at', '<', cutoff)
      .executeTakeFirst();

    return Number(result.numDeletedRows ?? 0);
  }

  /**
   * Every CRUD action writes an audit_log with heavy JSONB blobs.
   * Keep 1 year for compliance, purge beyond.
   */
  private async cleanAuditLogs(): Promise<number> {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);

    const result = await this.db
      .deleteFrom('audit_logs')
      .where('created_at', '<', cutoff)
      .executeTakeFirst();

    return Number(result.numDeletedRows ?? 0);
  }

  /**
   * In-app notifications accumulate. Delete read notifications > 90 days,
   * unread notifications > 1 year.
   */
  private async cleanInAppNotifications(): Promise<number> {
    const readCutoff = new Date();
    readCutoff.setDate(readCutoff.getDate() - 90);

    const unreadCutoff = new Date();
    unreadCutoff.setFullYear(unreadCutoff.getFullYear() - 1);

    const result = await this.db
      .deleteFrom('in_app_notifications')
      .where((eb) =>
        eb.or([
          eb('is_read', '=', true).and('created_at', '<', readCutoff),
          eb('is_read', '=', false).and('created_at', '<', unreadCutoff),
        ]),
      )
      .executeTakeFirst();

    return Number(result.numDeletedRows ?? 0);
  }

  // ─── Low / Weekly ─────────────────────────────

  /**
   * Soft-deleted entities: clients, assets, contracts, client_account_managers.
   * Purge rows with deleted_at older than 1 year.
   */
  private async cleanSoftDeletedEntities(): Promise<number> {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);

    let total = 0;

    const tables = ['clients', 'assets', 'contracts', 'client_account_managers'] as const;

    for (const table of tables) {
      const result = await this.db
        .deleteFrom(table as any)
        .where('deleted_at', '<', cutoff as any)
        .executeTakeFirst();
      total += Number(result.numDeletedRows ?? 0);
    }

    return total;
  }

  /**
   * Contract renewals: low volume, but keep only the last 10 per contract
   * and purge entries older than 5 years.
   */
  private async cleanContractRenewals(): Promise<number> {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    // Phase 1: purge anything older than 5 years
    const phase1 = await this.db
      .deleteFrom('contract_renewals')
      .where('renewed_at', '<', fiveYearsAgo)
      .executeTakeFirst();

    let phase2 = 0n;

    // Phase 2: keep only the last 10 renewals per contract
    const result = await sql<{ deleted: bigint }>`
      DELETE FROM contract_renewals
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY contract_id
            ORDER BY renewed_at DESC
          ) AS rn
          FROM contract_renewals
        ) ranked
        WHERE rn > 10
      )
    `.execute(this.db);

    phase2 = result.rows?.[0]?.deleted ?? 0n;

    const total = Number(phase1.numDeletedRows ?? 0n) + Number(phase2);
    return total;
  }
}
