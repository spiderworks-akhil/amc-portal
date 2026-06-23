import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotesService } from './notes.service';
import { CreateNoteDto, ListNotesDto, UpdateNoteDto } from './dto';

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Note created successfully')
  @AuditLog({ entityType: 'note' })
  async create(
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.notesService.create(dto, user.id);
  }

  @Get('list')
  @HttpCode(HttpStatus.OK)
  async list(@Query() dto: ListNotesDto) {
    return this.notesService.list(dto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.notesService.getById(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Note updated successfully')
  @AuditLog({ entityType: 'note' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Note deleted successfully')
  @AuditLog({ entityType: 'note' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.notesService.remove(id);
  }
}
