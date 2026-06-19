import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';

@Controller('reminder')
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateReminderDto) {
    return this.reminderService.create(dto);
  }

  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: string,
    @Query('target_type') target_type?: string,
  ) {
    return this.reminderService.findAll({ page, limit, status, target_type });
  }

  @Get('upcoming')
  findUpcoming(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    return this.reminderService.findUpcoming(days ?? 7);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reminderService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReminderDto,
  ) {
    return this.reminderService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.reminderService.remove(id);
  }
}
