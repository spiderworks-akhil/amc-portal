import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../db/database.module';
import { SslController } from './ssl.controller';
import { SslService } from './ssl.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SslController],
  providers: [SslService],
})
export class SslModule {}
