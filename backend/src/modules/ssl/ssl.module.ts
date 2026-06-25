import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../db/database.module';
import { QueueModule } from '../../queue/queue.module';
import { BullModule } from '@nestjs/bullmq';
import { SslController } from './ssl.controller';
import { SslService } from './ssl.service';
import { SslRefreshProcessor } from '../../jobs/ssl-refresh.processor';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    DatabaseModule,
    QueueModule,
    BullModule.registerQueue({ name: 'ssl-refresh' }),
    WhatsappModule,
  ],
  controllers: [SslController],
  providers: [SslService, SslRefreshProcessor],
  exports: [SslService],
})
export class SslModule {}
