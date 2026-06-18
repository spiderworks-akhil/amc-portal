import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { DomainService } from '../modules/domain/domain.service';

@Processor('domain-refresh')
export class DomainRefreshProcessor extends WorkerHost {
  private readonly logger = new Logger(DomainRefreshProcessor.name);

  constructor(private readonly domainService: DomainService) {
    super();
  }

  async process(job: Job<{ domainId: string }>): Promise<void> {
    this.logger.log(`Processing domain refresh for ${job.data.domainId}`);
    try {
      await this.domainService.refreshDomain(job.data.domainId);
    } catch (err) {
      this.logger.error(`Domain refresh failed for ${job.data.domainId}: ${err}`);
    }
  }
}
