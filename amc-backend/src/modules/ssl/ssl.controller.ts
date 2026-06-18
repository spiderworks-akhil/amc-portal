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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SslService } from './ssl.service';
import {
  CreateSslDto,
  UpdateSslDto,
  ListSslDto,
} from './dto';

@Controller('ssl')
export class SslController {
  constructor(private readonly sslService: SslService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('SSL certificate created successfully')
  async create(
    @Body() dto: CreateSslDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.sslService.create(dto, user.id);
  }

  @Get('list')
  @HttpCode(HttpStatus.OK)
  async list(@Query() dto: ListSslDto) {
    return this.sslService.list(dto);
  }

  @Get('expiring')
  @HttpCode(HttpStatus.OK)
  async getExpiring(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    return this.sslService.getExpiringCerts(days ?? 30);
  }

  @Get('lookup-details')
  @HttpCode(HttpStatus.OK)
  async lookupDetails(
    @Query('hostname') hostname: string,
  ) {
    return this.sslService.lookupSslCertDetails(hostname);
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getStats() {
    return this.sslService.getExpiryStats();
  }

  @Post(':id/check')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('SSL certificate check completed')
  async triggerCheck(@Param('id', ParseUUIDPipe) id: string) {
    return this.sslService.triggerCheck(id);
  }

  @Get(':id/snapshots')
  @HttpCode(HttpStatus.OK)
  async listSnapshots(@Param('id', ParseUUIDPipe) id: string) {
    return this.sslService.listSnapshots(id);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.sslService.getById(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('SSL certificate updated successfully')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSslDto,
  ) {
    return this.sslService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('SSL certificate deleted successfully')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.sslService.remove(id);
  }
}
