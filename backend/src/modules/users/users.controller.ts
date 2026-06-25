import { Controller, Get, HttpCode, HttpStatus, Param, Patch, Body, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('list')
  @HttpCode(HttpStatus.OK)
  async list(@Query() dto: ListUsersDto) {
    return this.usersService.list(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listActive() {
    return this.usersService.listActiveUsers();
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
}
