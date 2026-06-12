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
} from '@nestjs/common';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { ProviderService } from './provider.service';
import {
  CreateProviderDto,
  UpdateProviderDto,
  ListProvidersDto,
} from './dto';

@Controller('provider')
export class ProviderController {
  constructor(private readonly providerService: ProviderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Provider created successfully')
  async create(@Body() dto: CreateProviderDto) {
    return this.providerService.create(dto);
  }

  @Get('list')
  @HttpCode(HttpStatus.OK)
  async list(@Query() dto: ListProvidersDto) {
    return this.providerService.list(dto);
  }

  @Get('types')
  @HttpCode(HttpStatus.OK)
  async getTypes() {
    return this.providerService.getTypes();
  }

  @Get('type/:type')
  @HttpCode(HttpStatus.OK)
  async getByType(@Param('type') type: string) {
    return this.providerService.getByType(type);
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getStats() {
    return this.providerService.getStats();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.providerService.getById(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Provider updated successfully')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProviderDto,
  ) {
    return this.providerService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Provider deleted successfully')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.providerService.remove(id);
  }
}
