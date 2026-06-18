import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../../db/database.module';
import { IncidentService } from './incident.service';
import { IncidentController } from './incident.controller';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  controllers: [IncidentController],
  providers: [IncidentService],
})
export class IncidentModule {}
