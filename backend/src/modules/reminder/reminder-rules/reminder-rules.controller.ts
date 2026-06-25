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
} from '@nestjs/common';
import { ReminderRulesService } from './reminder-rules.service';
import { CreateReminderRuleDto } from './dto/create-reminder-rule.dto';
import { UpdateReminderRuleDto } from './dto/update-reminder-rule.dto';

@Controller('reminder-rules')
export class ReminderRulesController {
  constructor(private readonly reminderRulesService: ReminderRulesService) {}

  @Post()
  create(@Body() dto: CreateReminderRuleDto) {
    return this.reminderRulesService.create(dto);
  }

  @Get()
  findAll(@Query('enabled') enabled?: string) {
    return this.reminderRulesService.findAll(enabled);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reminderRulesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReminderRuleDto,
  ) {
    return this.reminderRulesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.reminderRulesService.remove(id);
  }
}
