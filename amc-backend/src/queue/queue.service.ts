import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('monitor-checks') private readonly monitorQueue: Queue,
    @InjectQueue('domain-refresh') private readonly domainRefreshQueue: Queue,
    @InjectQueue('ssl-refresh') private readonly sslRefreshQueue: Queue,
  ) {}

  // ── Monitor checks ──

  async scheduleMonitorCheck(monitorId: string, intervalSeconds: number) {
    try {
      await this.monitorQueue.add(
        'monitor-check',
        { monitorId },
        {
          jobId: `monitor-check-${monitorId}`,
          repeat: { every: intervalSeconds * 1000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      this.logger.log(`Scheduled monitor check ${monitorId} every ${intervalSeconds}s`);
    } catch (err) {
      this.logger.error(`Failed to schedule monitor check ${monitorId}: ${err}`);
    }
  }

  async removeScheduledCheck(monitorId: string) {
    try {
      const repeatableJobs = await this.monitorQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.id === `monitor-check-${monitorId}`) {
          await this.monitorQueue.removeRepeatableByKey(job.key);
          this.logger.log(`Removed scheduled check for ${monitorId}`);
        }
      }
    } catch (err) {
      this.logger.error(`Failed to remove scheduled check ${monitorId}: ${err}`);
    }
  }

  async triggerImmediateCheck(monitorId: string) {
    try {
      await this.monitorQueue.add(
        'monitor-check',
        { monitorId },
        {
          jobId: `immediate-check-${monitorId}-${Date.now()}`,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (err) {
      this.logger.error(`Failed to trigger immediate check ${monitorId}: ${err}`);
    }
  }

  // ── Domain refresh ──

  async scheduleDomainRefresh(domainId: string, cron: string) {
    try {
      await this.domainRefreshQueue.add(
        'domain-refresh',
        { domainId },
        {
          jobId: `domain-refresh-${domainId}`,
          repeat: { pattern: cron },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      this.logger.log(`Scheduled domain refresh ${domainId} with cron "${cron}"`);
    } catch (err) {
      this.logger.error(`Failed to schedule domain refresh ${domainId}: ${err}`);
    }
  }

  async removeScheduledDomainRefresh(domainId: string) {
    try {
      const repeatableJobs = await this.domainRefreshQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.id === `domain-refresh-${domainId}`) {
          await this.domainRefreshQueue.removeRepeatableByKey(job.key);
          this.logger.log(`Removed scheduled domain refresh for ${domainId}`);
        }
      }
    } catch (err) {
      this.logger.error(`Failed to remove domain refresh ${domainId}: ${err}`);
    }
  }

  async triggerImmediateDomainRefresh(domainId: string) {
    try {
      await this.domainRefreshQueue.add(
        'domain-refresh',
        { domainId },
        {
          jobId: `immediate-domain-refresh-${domainId}-${Date.now()}`,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (err) {
      this.logger.error(`Failed to trigger immediate domain refresh ${domainId}: ${err}`);
    }
  }

  // ── SSL refresh ──

  async scheduleSslRefresh(sslId: string, cron: string) {
    try {
      await this.sslRefreshQueue.add(
        'ssl-refresh',
        { sslId },
        {
          jobId: `ssl-refresh-${sslId}`,
          repeat: { pattern: cron },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      this.logger.log(`Scheduled SSL refresh ${sslId} with cron "${cron}"`);
    } catch (err) {
      this.logger.error(`Failed to schedule SSL refresh ${sslId}: ${err}`);
    }
  }

  async removeScheduledSslRefresh(sslId: string) {
    try {
      const repeatableJobs = await this.sslRefreshQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.id === `ssl-refresh-${sslId}`) {
          await this.sslRefreshQueue.removeRepeatableByKey(job.key);
          this.logger.log(`Removed scheduled SSL refresh for ${sslId}`);
        }
      }
    } catch (err) {
      this.logger.error(`Failed to remove SSL refresh ${sslId}: ${err}`);
    }
  }

  async triggerImmediateSslRefresh(sslId: string) {
    try {
      await this.sslRefreshQueue.add(
        'ssl-refresh',
        { sslId },
        {
          jobId: `immediate-ssl-refresh-${sslId}-${Date.now()}`,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (err) {
      this.logger.error(`Failed to trigger immediate SSL refresh ${sslId}: ${err}`);
    }
  }
}
