import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('monitor-checks') private readonly monitorQueue: Queue,
  ) {}

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
}
