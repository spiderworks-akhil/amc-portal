import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../../db/database.module';
import { ConfigModule } from '../config/config.module';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';

@Module({
  imports: [HttpModule, DatabaseModule, ConfigModule],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
