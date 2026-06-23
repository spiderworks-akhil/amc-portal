import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ScopesService } from './scopes.service';
import { CreateScopeDto, UpdateScopeDto, LinkScopesDto } from './dto';

@Controller('scopes')
export class ScopesController {
  constructor(private readonly scopesService: ScopesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Scope created successfully')
  @AuditLog({ entityType: 'scope' })
  async create(
    @Body() dto: CreateScopeDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.scopesService.create(dto, user.id);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listAll() {
    return this.scopesService.listAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.scopesService.getById(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Scope updated successfully')
  @AuditLog({ entityType: 'scope' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScopeDto,
  ) {
    return this.scopesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Scope deleted successfully')
  @AuditLog({ entityType: 'scope' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.scopesService.remove(id);
  }

  // ── Asset linking ──

  @Post('asset/:assetId')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Scopes linked to asset successfully')
  @AuditLog({ entityType: 'scope' })
  async addScopesToAsset(
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Body() dto: LinkScopesDto,
  ) {
    return this.scopesService.addScopesToAsset(assetId, dto);
  }

  @Delete('asset/:assetId')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Scopes unlinked from asset successfully')
  @AuditLog({ entityType: 'scope' })
  async removeScopesFromAsset(
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Body() dto: LinkScopesDto,
  ) {
    return this.scopesService.removeScopesFromAsset(assetId, dto);
  }

  @Get('asset/:assetId')
  @HttpCode(HttpStatus.OK)
  async listScopesForAsset(@Param('assetId', ParseUUIDPipe) assetId: string) {
    return this.scopesService.listScopesForAsset(assetId);
  }
}
