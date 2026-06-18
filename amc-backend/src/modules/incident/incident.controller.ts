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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IncidentService } from './incident.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { ListIncidentsDto } from './dto/list-incidents.dto';

@Controller('incident')
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Incident created successfully')
  async create(
    @Body() dto: CreateIncidentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.incidentService.create(dto, user.id);
  }

  @Get('list')
  @HttpCode(HttpStatus.OK)
  async list(@Query() dto: ListIncidentsDto) {
    return this.incidentService.list(dto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.incidentService.getById(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Incident updated successfully')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentDto,
  ) {
    return this.incidentService.update(id, dto);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Incident resolved successfully')
  async resolve(@Param('id', ParseUUIDPipe) id: string) {
    return this.incidentService.resolve(id);
  }

  @Post(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Incident acknowledged successfully')
  async acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.incidentService.acknowledge(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Incident deleted successfully')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.incidentService.remove(id);
  }
}
