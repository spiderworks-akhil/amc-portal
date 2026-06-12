import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../db/database.module';
import { ServerController } from './server.controller';
import { ServerService } from './server.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ServerController],
  providers: [ServerService],
})
export class ServerModule {}
