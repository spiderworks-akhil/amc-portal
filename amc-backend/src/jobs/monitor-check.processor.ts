import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, NotFoundException } from '@nestjs/common';
import { MonitorService } from '../modules/monitor/monitor.service';

@Processor('monitor-checks')
export class MonitorCheckProcessor extends WorkerHost {
  private readonly logger = new Logger(MonitorCheckProcessor.name);

  constructor(private readonly monitorService: MonitorService) {
    super();
  }

  async process(job: Job<{ monitorId: string }>): Promise<void> {
    this.logger.log(`Processing monitor check for ${job.data.monitorId}`);
    try {
      await this.monitorService.triggerCheck(job.data.monitorId);
    } catch (err) {
      if (err instanceof NotFoundException) {
        this.logger.warn(`Monitor ${job.data.monitorId} no longer exists — removing scheduled check`);
        try {
          await job.remove();
        } catch {
          // Best-effort cleanup
        }
      } else {
        this.logger.error(`Monitor check failed for ${job.data.monitorId}: ${err}`);
      }
    }
  }
}
