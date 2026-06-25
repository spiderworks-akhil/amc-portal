import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../db/database.module';
import { SslModule } from '../ssl/ssl.module';
import { QueueModule } from '../../queue/queue.module';
import { BullModule } from '@nestjs/bullmq';
import { DomainController } from './domain.controller';
import { DomainService } from './domain.service';
import { DomainRefreshProcessor } from '../../jobs/domain-refresh.processor';

@Module({
  imports: [
    DatabaseModule,
    SslModule,
    QueueModule,
    BullModule.registerQueue({ name: 'domain-refresh' }),
  ],
  controllers: [DomainController],
  providers: [DomainService, DomainRefreshProcessor],
})
export class DomainModule {}
