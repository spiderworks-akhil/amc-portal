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
import { DomainService } from './domain.service';
import {
  CreateDomainDto,
  UpdateDomainDto,
  ListDomainsDto,
} from './dto';

@Controller('domain')
export class DomainController {
  constructor(private readonly domainService: DomainService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Domain created successfully')
  async create(@Body() dto: CreateDomainDto) {
    return this.domainService.create(dto);
  }

  @Get('list')
  @HttpCode(HttpStatus.OK)
  async list(@Query() dto: ListDomainsDto) {
    return this.domainService.list(dto);
  }

  @Get('expiring')
  @HttpCode(HttpStatus.OK)
  async getExpiring(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    return this.domainService.getExpiringDomains(days ?? 30);
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getStats() {
    return this.domainService.getExpiryStats();
  }

  @Post(':id/check')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Domain check completed')
  async triggerCheck(@Param('id', ParseUUIDPipe) id: string) {
    return this.domainService.triggerCheck(id);
  }

  @Get('verify-fqdn')
  @HttpCode(HttpStatus.OK)
  async verifyFqdn(@Query('fqdn') fqdn: string) {
    return this.domainService.lookupDomainDetails(fqdn);
  }

  @Get(':id/snapshots')
  @HttpCode(HttpStatus.OK)
  async listSnapshots(@Param('id', ParseUUIDPipe) id: string) {
    return this.domainService.listSnapshots(id);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.domainService.getById(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Domain updated successfully')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDomainDto,
  ) {
    return this.domainService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Domain deleted successfully')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.domainService.remove(id);
  }
}
