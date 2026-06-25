import { Module } from '@nestjs/common';
import { ReminderRulesService } from './reminder-rules.service';
import { ReminderRulesController } from './reminder-rules.controller';

@Module({
  controllers: [ReminderRulesController],
  providers: [ReminderRulesService],
  exports: [ReminderRulesService],
})
export class ReminderRulesModule {}
