import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../db/database.module';
import { MonitorModule } from '../monitor/monitor.module';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';

@Module({
  imports: [DatabaseModule, MonitorModule],
  controllers: [AssetController],
  providers: [AssetService],
})
export class AssetModule {}
