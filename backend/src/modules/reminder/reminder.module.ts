import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailModule } from '../email/email.module';
import { ReminderService } from './reminder.service';
import { ReminderController } from './reminder.controller';
import { ReminderDispatcherService } from './reminder-dispatcher.service';
import { ReminderCleanupService } from './reminder-cleanup.service';
import { ReminderRulesModule } from './reminder-rules/reminder-rules.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { ReminderCreationProcessor } from '../../jobs/reminder-creation.processor';
import { ReminderSendingProcessor } from '../../jobs/reminder-sending.processor';

@Module({
  controllers: [ReminderController],
  providers: [
    ReminderService,
    ReminderDispatcherService,
    ReminderCleanupService,
    ReminderCreationProcessor,
    ReminderSendingProcessor,
  ],
  imports: [
    ReminderRulesModule,
    ScheduleModule.forRoot(),
    EmailModule,
    NotificationsModule,
    WhatsappModule,
  ],
})
export class ReminderModule {}
