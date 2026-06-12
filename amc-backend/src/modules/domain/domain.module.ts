import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../db/database.module';
import { DomainController } from './domain.controller';
import { DomainService } from './domain.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DomainController],
  providers: [DomainService],
})
export class DomainModule {}
