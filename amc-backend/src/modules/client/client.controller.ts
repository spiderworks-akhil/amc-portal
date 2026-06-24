import {
  Controller, Get, Post, Put, Delete,
  Param, Query, Body,
  HttpCode, HttpStatus, ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { ClientService } from './client.service';
import {
  CreateClientDto,
  ListClientsDto,
  UpdateClientDto,
  ManagerIdsDto,
  CreateContactDto,
  UpdateContactDto,
} from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Client created successfully')
  @AuditLog({ entityType: 'client' })
  
  async create(@Body() dto: CreateClientDto, @CurrentUser() user: { id: string }) {
    return this.clientService.createClient(dto, user.id);
  }

  @Get('list')
  @HttpCode(HttpStatus.OK)
  async list(@Query() dto: ListClientsDto) {
    return this.clientService.listClients(dto);
  }


  @Get('external/list')
  @HttpCode(HttpStatus.OK)
  async listExternal(
    @CurrentUser() user: { id: string },
    @Query('query') query?: string,
  ) {
    return this.clientService.listExternalClients(user.id, query);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Clients synced successfully')
  async syncAll(@CurrentUser() user: { id: string }) {
    return this.clientService.syncAllClients(user.id);
  }

  @Post(':id/sync')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Client synced successfully')
  async syncOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.clientService.syncClient(id, user.id);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.getClient(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Client updated successfully')
  @AuditLog({ entityType: 'client' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.clientService.updateClient(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Client deleted successfully')
  @AuditLog({ entityType: 'client' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.deleteClient(id);
  }

  @Post(':id/managers')
  @AuditLog({ entityType: 'client' })
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Managers assigned successfully')
  async addManagers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManagerIdsDto,
  ) {
    return this.clientService.addAccountManagers(id, dto);
  }

  @Delete(':id/managers')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Managers removed successfully')
  @AuditLog({ entityType: 'client' })
  async removeManagers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManagerIdsDto,
  ) {
    return this.clientService.removeAccountManagers(id, dto);
  }

  @Post(':id/contacts')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Contact added successfully')
  @AuditLog({ entityType: 'client' })
  async addContacts(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.clientService.addContact(id, dto);
  }

  @Put('contacts/:contactId')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Contact updated successfully')
  @AuditLog({ entityType: 'client', idParam: 'contactId' })
  async updateContact(
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.clientService.updateContact(contactId, dto);
  }

  @Delete('contacts/:contactId')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Contact deleted successfully')
  @AuditLog({ entityType: 'client', idParam: 'contactId' })
  async removeContact(@Param('contactId', ParseUUIDPipe) contactId: string) {
    return this.clientService.deleteContact(contactId);
  }
}
