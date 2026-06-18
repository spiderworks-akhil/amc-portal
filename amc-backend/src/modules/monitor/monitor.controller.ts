import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { MonitorService } from './monitor.service';
import {
  CreateMonitorDto,
  UpdateMonitorDto,
  ListMonitorsDto,
} from './dto';

@Controller('monitor')
export class MonitorController {
  constructor(private readonly monitorService: MonitorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Monitor created successfully')
  async create(@Body() dto: CreateMonitorDto) {
    return this.monitorService.create(dto);
  }

  @Get('list')
  @HttpCode(HttpStatus.OK)
  async list(@Query() dto: ListMonitorsDto) {
    return this.monitorService.list(dto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.monitorService.getById(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Monitor updated successfully')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMonitorDto,
  ) {
    return this.monitorService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Monitor deleted successfully')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.monitorService.remove(id);
  }

  @Post(':id/check')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Monitor check completed')
  async triggerCheck(@Param('id', ParseUUIDPipe) id: string) {
    return this.monitorService.triggerCheck(id);
  }

  @Get(':id/checks')
  @HttpCode(HttpStatus.OK)
  async listChecks(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.monitorService.getCheckHistory(id, page ?? 1, limit ?? 50);
  }
}
