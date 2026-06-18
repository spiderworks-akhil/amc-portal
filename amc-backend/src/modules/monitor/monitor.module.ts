import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../db/database.module';
import { QueueModule } from '../../queue/queue.module';
import { BullModule } from '@nestjs/bullmq';
import { MonitorController } from './monitor.controller';
import { MonitorService } from './monitor.service';
import { MonitorCheckProcessor } from '../../jobs/monitor-check.processor';

@Module({
  imports: [
    DatabaseModule,
    QueueModule,
    BullModule.registerQueue({ name: 'monitor-checks' }),
  ],
  controllers: [MonitorController],
  providers: [MonitorService, MonitorCheckProcessor],
  exports: [MonitorService],
})
export class MonitorModule {}
