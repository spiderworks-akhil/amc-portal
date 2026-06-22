import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailModule } from '../email/email.module';
import { ReminderService } from './reminder.service';
import { ReminderController } from './reminder.controller';
import { ReminderDispatcherService } from './reminder-dispatcher.service';
import { ReminderCleanupService } from './reminder-cleanup.service';
import { ReminderRulesModule } from './reminder-rules/reminder-rules.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [ReminderController],
  providers: [ReminderService, ReminderDispatcherService, ReminderCleanupService],
  imports: [
    ReminderRulesModule,
    ScheduleModule.forRoot(),
    EmailModule,
    NotificationsModule,
  ],
})
export class ReminderModule {}
