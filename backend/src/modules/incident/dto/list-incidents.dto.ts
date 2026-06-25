import { IsEnum, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum IncidentSortBy {
  SEVERITY = 'severity',
  STARTED_AT = 'started_at',
  RESOLVED_AT = 'resolved_at',
  CREATED_AT = 'created_at',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListIncidentsDto {
  @Type(() => Number)
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 50;

  @IsUUID()
  @IsOptional()
  monitor_id?: string;

  @IsString()
  @IsOptional()
  severity?: string;

  @IsString()
  @IsOptional()
  status?: 'open' | 'resolved';

  @IsEnum(IncidentSortBy)
  @IsOptional()
  sort_by?: IncidentSortBy = IncidentSortBy.STARTED_AT;

  @IsEnum(SortOrder)
  @IsOptional()
  sort_order?: SortOrder = SortOrder.DESC;
}
