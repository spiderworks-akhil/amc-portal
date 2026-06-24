import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ServerSortBy {
  LABEL = 'label',
  PROVIDER_NAME = 'provider_name',
  REGION = 'region',
  MONTHLY_COST = 'monthly_cost',
  RENEWAL_DATE = 'renewal_date',
  CREATED_AT = 'created_at',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListServersDto {
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
  provider_id?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  owner?: string;

  @IsDateString()
  @IsOptional()
  renewal_date_from?: string;

  @IsDateString()
  @IsOptional()
  renewal_date_to?: string;

  @IsEnum(ServerSortBy)
  @IsOptional()
  sort_by?: ServerSortBy = ServerSortBy.LABEL;

  @IsEnum(SortOrder)
  @IsOptional()
  sort_order?: SortOrder = SortOrder.ASC;
}
