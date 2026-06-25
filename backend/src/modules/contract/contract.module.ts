import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../db/database.module';
import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ContractController],
  providers: [ContractService],
})
export class ContractModule {}
