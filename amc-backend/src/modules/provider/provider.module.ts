import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../db/database.module';
import { ProviderController } from './provider.controller';
import { ProviderService } from './provider.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProviderController],
  providers: [ProviderService],
})
export class ProviderModule {}
