import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from 'src/db/database.module';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';

@Module({
  imports: [HttpModule, DatabaseModule],
  controllers: [ClientController],
  providers: [ClientService],
})
export class ClientModule {}
