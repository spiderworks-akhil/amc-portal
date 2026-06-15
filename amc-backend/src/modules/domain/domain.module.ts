import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../db/database.module';
import { SslModule } from '../ssl/ssl.module';
import { DomainController } from './domain.controller';
import { DomainService } from './domain.service';

@Module({
  imports: [DatabaseModule, SslModule],
  controllers: [DomainController],
  providers: [DomainService],
})
export class DomainModule {}
