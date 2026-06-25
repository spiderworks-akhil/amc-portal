import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../db/database.module';
import { ServerController } from './server.controller';
import { ServerService } from './server.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [DatabaseModule, WhatsappModule],
  controllers: [ServerController],
  providers: [ServerService],
})
export class ServerModule {}
