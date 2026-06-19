import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MailerModule } from '@nestjs-modules/mailer';
import { ReminderService } from './reminder.service';
import { ReminderController } from './reminder.controller';
import { ReminderDispatcherService } from './reminder-dispatcher.service';
import { ReminderEmailService } from './reminder-email.service';
import { ReminderRulesModule } from './reminder-rules/reminder-rules.module';

@Module({
  controllers: [ReminderController],
  providers: [ReminderService, ReminderDispatcherService, ReminderEmailService],
  imports: [
    ReminderRulesModule,
    ScheduleModule.forRoot(),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const host = cfg.get<string>('SMTP_HOST') ?? 'localhost';
        const port = cfg.get<number>('SMTP_PORT') ?? 587;
        const secure = cfg.get<boolean>('SMTP_SECURE') ?? false;
        const user = cfg.get<string>('SMTP_USER') ?? '';
        const pass = cfg.get<string>('SMTP_PASSWORD') ?? '';
        const from = cfg.get<string>('SMTP_FROM') ?? 'noreply@amcportal.com';

        return {
          transport: {
            host,
            port,
            secure,
            auth: { user, pass },
          },
          defaults: { from },
        };
      },
    }),
  ],
})
export class ReminderModule {}
