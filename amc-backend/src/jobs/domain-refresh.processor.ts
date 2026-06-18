import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, NotFoundException } from '@nestjs/common';
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
      if (err instanceof NotFoundException) {
        this.logger.warn(`Domain ${job.data.domainId} no longer exists — removing scheduled refresh`);
        // Attempt to clean up the orphaned job
        try {
          await job.remove();
        } catch {
          // Best-effort cleanup
        }
      } else {
        this.logger.error(`Domain refresh failed for ${job.data.domainId}: ${err}`);
      }
    }
  }
}
