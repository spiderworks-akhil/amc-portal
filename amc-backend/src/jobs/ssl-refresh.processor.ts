import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { SslService } from '../modules/ssl/ssl.service';

@Processor('ssl-refresh')
export class SslRefreshProcessor extends WorkerHost {
  private readonly logger = new Logger(SslRefreshProcessor.name);

  constructor(private readonly sslService: SslService) {
    super();
  }

  async process(job: Job<{ sslId: string }>): Promise<void> {
    this.logger.log(`Processing SSL refresh for ${job.data.sslId}`);
    try {
      await this.sslService.triggerCheck(job.data.sslId);
    } catch (err) {
      this.logger.error(`SSL refresh failed for ${job.data.sslId}: ${err}`);
    }
  }
}
