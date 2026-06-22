import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { CronBootstrapService } from './cron-bootstrap.service';
import { DatabaseModule } from '../db/database.module';

@Module({
  imports: [
    DatabaseModule,
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: 'monitor-checks' }),
    BullModule.registerQueue({ name: 'domain-refresh' }),
    BullModule.registerQueue({ name: 'ssl-refresh' }),
    BullModule.registerQueue({ name: 'incident-notifications' }),
    BullModule.registerQueue({ name: 'reminder-creation' }),
    BullModule.registerQueue({ name: 'reminder-sending' }),
  ],
  controllers: [QueueController],
  providers: [QueueService, CronBootstrapService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
