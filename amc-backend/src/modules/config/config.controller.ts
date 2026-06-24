import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ConfigService, ConfigGroup } from './config.service';
import { UpdateSmtpConfigDto, UpdateWhatsAppConfigDto } from './dto';

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get(':group')
  @HttpCode(HttpStatus.OK)
  async get(@Param('group') group: ConfigGroup) {
    return this.configService.getConfig(group);
  }

  @Put('smtp')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('SMTP config updated successfully')
  @AuditLog({ entityType: 'config' })
  async updateSmtp(
    @Body() dto: UpdateSmtpConfigDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.configService.updateSmtp(dto, user.id);
  }

  @Put('whatsapp')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('WhatsApp config updated successfully')
  @AuditLog({ entityType: 'config' })
  async updateWhatsApp(
    @Body() dto: UpdateWhatsAppConfigDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.configService.updateWhatsApp(dto, user.id);
  }
}
