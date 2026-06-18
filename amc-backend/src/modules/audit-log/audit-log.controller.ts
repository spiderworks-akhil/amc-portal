import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { CreateAuditLogDto, ListAuditLogsDto } from './dto/create-audit-log.dto';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Audit log created')
  @AuditLog({ entityType: 'user' })
  async create(@Body() dto: CreateAuditLogDto) {
    return this.auditLogService.create(dto);
  }

  @Get('list')
  @HttpCode(HttpStatus.OK)
  async list(@Query() dto: ListAuditLogsDto) {
    return this.auditLogService.list(dto);
  }

  @Get('recent')
  @HttpCode(HttpStatus.OK)
  async getRecent(@Query('limit') limit?: string) {
    return this.auditLogService.getRecent(limit ? parseInt(limit, 10) : 20);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditLogService.getById(id);
  }
}
