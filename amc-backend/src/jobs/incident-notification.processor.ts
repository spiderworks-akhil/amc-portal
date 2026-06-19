import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { IncidentNotificationService } from '../modules/incident/incident-notification.service';

@Processor('incident-notifications', {
  concurrency: 5,
})
export class IncidentNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(IncidentNotificationProcessor.name);

  constructor(
    private readonly incidentNotification: IncidentNotificationService,
  ) {
    super();
  }

  async process(job: Job<{ incidentId: string }>): Promise<void> {
    this.logger.log(
      `Processing incident notification for ${job.data.incidentId} (attempt ${job.attemptsMade + 1})`,
    );

    try {
      await this.incidentNotification.sendNotification(job.data.incidentId);
    } catch (err) {
      this.logger.error(
        `Incident notification failed for ${job.data.incidentId}: ${err}`,
      );
      throw err; // Re-throw so Bull can retry
    }
  }
}
