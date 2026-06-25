import { IsEnum, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum MonitorSortBy {
  NAME = 'name',
  STATUS = 'current_status',
  TYPE = 'check_type',
  CREATED_AT = 'created_at',
  LAST_CHECKED = 'last_checked_at',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListMonitorsDto {
  @Type(() => Number)
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 50;

  @IsString()
  @IsOptional()
  search?: string;

  @IsUUID()
  @IsOptional()
  asset_id?: string;

  @IsString()
  @IsOptional()
  check_type?: string;

  @IsString()
  @IsOptional()
  current_status?: string;

  @IsEnum(MonitorSortBy)
  @IsOptional()
  sort_by?: MonitorSortBy = MonitorSortBy.NAME;

  @IsEnum(SortOrder)
  @IsOptional()
  sort_order?: SortOrder = SortOrder.ASC;
}
