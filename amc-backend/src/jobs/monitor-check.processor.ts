import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
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
      this.logger.error(`Monitor check failed for ${job.data.monitorId}: ${err}`);
    }
  }
}
