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
import { ServerService } from './server.service';
import {
  CreateServerDto,
  UpdateServerDto,
  ListServersDto,
  AssetIdsDto,
} from './dto';

@Controller('server')
export class ServerController {
  constructor(private readonly serverService: ServerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Server created successfully')
  async create(@Body() dto: CreateServerDto) {
    return this.serverService.create(dto);
  }

  @Get('list')
  @HttpCode(HttpStatus.OK)
  async list(@Query() dto: ListServersDto) {
    return this.serverService.list(dto);
  }

  @Get('expiring')
  @HttpCode(HttpStatus.OK)
  async getExpiring(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    return this.serverService.getExpiringServers(days ?? 30);
  }

  @Get('renewal-stats')
  @HttpCode(HttpStatus.OK)
  async getRenewalStats() {
    return this.serverService.getRenewalStats();
  }

  @Get('detect-provider')
  @HttpCode(HttpStatus.OK)
  async detectProvider(
    @Query('ip') ip: string,
  ) {
    return this.serverService.detectProviderByIp(ip);
  }

  @Get('total-cost')
  @HttpCode(HttpStatus.OK)
  async getTotalMonthlyCost() {
    return this.serverService.getTotalMonthlyCost();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.serverService.getById(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Server updated successfully')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServerDto,
  ) {
    return this.serverService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Server deleted successfully')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.serverService.remove(id);
  }

  // ── Asset linking ──

  @Post(':id/assets')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Assets linked to server successfully')
  async addAssets(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssetIdsDto,
  ) {
    return this.serverService.addAssets(id, dto);
  }

  @Delete(':id/assets')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Assets unlinked from server successfully')
  async removeAssets(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssetIdsDto,
  ) {
    return this.serverService.removeAssets(id, dto);
  }

  @Get(':id/assets')
  @HttpCode(HttpStatus.OK)
  async listAssets(@Param('id', ParseUUIDPipe) id: string) {
    return this.serverService.listAssets(id);
  }
}
