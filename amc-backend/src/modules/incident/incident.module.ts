import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../db/database.module';
import { IncidentService } from './incident.service';
import { IncidentController } from './incident.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [IncidentController],
  providers: [IncidentService],
})
export class IncidentModule {}
