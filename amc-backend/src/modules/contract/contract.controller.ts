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
import { ContractService } from './contract.service';
import {
  CreateContractDto,
  UpdateContractDto,
  ListContractsDto,
  AssetIdsDto,
  RenewContractDto,
} from './dto';

@Controller('contract')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Contract created successfully')
  async create(@Body() dto: CreateContractDto) {
    return this.contractService.create(dto);
  }

  @Get('list')
  @HttpCode(HttpStatus.OK)
  async list(@Query() dto: ListContractsDto) {
    return this.contractService.list(dto);
  }

  @Get('expiring')
  @HttpCode(HttpStatus.OK)
  async getExpiring(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    return this.contractService.getExpiringContracts(days ?? 30);
  }

  @Get('stats/:clientId')
  @HttpCode(HttpStatus.OK)
  async statsByClient(@Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.contractService.getStatsByClient(clientId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.contractService.getById(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Contract updated successfully')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractDto,
  ) {
    return this.contractService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Contract deleted successfully')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contractService.remove(id);
  }

  // ── Asset linking ──

  @Post(':id/assets')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Assets linked to contract successfully')
  async addAssets(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssetIdsDto,
  ) {
    return this.contractService.addAssets(id, dto);
  }

  @Delete(':id/assets')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Assets unlinked from contract successfully')
  async removeAssets(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssetIdsDto,
  ) {
    return this.contractService.removeAssets(id, dto);
  }

  @Get(':id/assets')
  @HttpCode(HttpStatus.OK)
  async listAssets(@Param('id', ParseUUIDPipe) id: string) {
    return this.contractService.listAssets(id);
  }

  // ── Renewals ──

  @Post(':id/renew')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Contract renewed successfully')
  async renew(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenewContractDto,
  ) {
    return this.contractService.renew(id, dto);
  }

  @Get(':id/renewals')
  @HttpCode(HttpStatus.OK)
  async listRenewals(@Param('id', ParseUUIDPipe) id: string) {
    return this.contractService.listRenewals(id);
  }
}
