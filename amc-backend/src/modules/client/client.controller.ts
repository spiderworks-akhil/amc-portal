import {
  Controller, Get, Post, Put, Delete,
  Param, Query, Body, Req,
  HttpCode, HttpStatus, UnauthorizedException, ParseUUIDPipe,
} from '@nestjs/common';
import type { Request } from 'express';
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

@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Client created successfully')
  @AuditLog({ entityType: 'client' })
  async create(@Body() dto: CreateClientDto) {
    return this.clientService.createClient(dto);
  }

  @Get('list')
  @HttpCode(HttpStatus.OK)
  async list(@Query() dto: ListClientsDto) {
    return this.clientService.listClients(dto);
  }


  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Clients synced successfully')
  async syncClients(@Req() req: Request) {
    const token = this.extractToken(req);
    if (!token) {
      throw new UnauthorizedException('No authentication token found');
    }
    return this.clientService.importClientsFromApi(token);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.getClient(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Client updated successfully')
  @AuditLog({ entityType: 'client' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientService.updateClient(id, dto);
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

  private extractToken(req: Request): string | undefined {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return req.cookies?.token;
  }
}
