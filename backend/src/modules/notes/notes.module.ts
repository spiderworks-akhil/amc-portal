import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../db/database.module';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';

@Module({
  imports: [DatabaseModule],
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
