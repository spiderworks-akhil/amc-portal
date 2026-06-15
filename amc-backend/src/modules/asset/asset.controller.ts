import {
  Controller, Get, Post, Put, Delete,
  Param, Query, Body,
  HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AssetService } from './asset.service';
import {
  CreateAssetDto,
  UpdateAssetDto,
  ListAssetsDto,
} from './dto';

@Controller('asset')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Asset created successfully')
  async create(@Body() dto: CreateAssetDto) {
    return this.assetService.create(dto);
  }

  @Get('list')
  @HttpCode(HttpStatus.OK)
  async list(@Query() dto: ListAssetsDto) {
    return this.assetService.list(dto);
  }

  @Get('stats/:clientId')
  @HttpCode(HttpStatus.OK)
  async statsByClient(@Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.assetService.getStatsByClient(clientId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetService.getById(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Asset updated successfully')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Asset deleted successfully')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetService.delete(id);
  }
}
