import { Controller, Post, Req, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { ClientService } from './client.service';

@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncClients(@Req() req: Request) {
    const token = this.extractToken(req);
    if (!token) {
      throw new UnauthorizedException('No authentication token found');
    }
    return this.clientService.importClientsFromApi(token);
  }

  private extractToken(req: Request): string | undefined {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return req.cookies?.token;
  }
}
