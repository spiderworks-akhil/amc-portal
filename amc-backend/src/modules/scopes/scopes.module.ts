import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../db/database.module';
import { ScopesController } from './scopes.controller';
import { ScopesService } from './scopes.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ScopesController],
  providers: [ScopesService],
})
export class ScopesModule {}
