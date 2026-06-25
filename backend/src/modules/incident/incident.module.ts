import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../../db/database.module';
import { QueueModule } from '../../queue/queue.module';
import { EmailModule } from '../email/email.module';
import { IncidentService } from './incident.service';
import { IncidentNotificationService } from './incident-notification.service';
import { IncidentController } from './incident.controller';
import { IncidentNotificationProcessor } from '../../jobs/incident-notification.processor';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    DatabaseModule,
    ScheduleModule.forRoot(),
    QueueModule,
    BullModule.registerQueue({ name: 'incident-notifications' }),
    EmailModule,
    NotificationsModule,
  ],
  controllers: [IncidentController],
  providers: [IncidentService, IncidentNotificationService, IncidentNotificationProcessor],
  exports: [IncidentService],
})
export class IncidentModule {}
