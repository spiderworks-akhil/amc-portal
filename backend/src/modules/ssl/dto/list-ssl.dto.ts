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
import { SslType } from 'src/db/types/enums';

export enum SslSortBy {
  COMMON_NAME = 'common_name',
  ISSUER = 'issuer',
  TYPE = 'type',
  VALID_TO = 'valid_to',
  CREATED_AT = 'created_at',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListSslDto {
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
  domain_id?: string;

  @IsUUID()
  @IsOptional()
  asset_id?: string;

  @IsEnum(SslType)
  @IsOptional()
  type?: SslType;

  @IsDateString()
  @IsOptional()
  valid_to_from?: string;

  @IsDateString()
  @IsOptional()
  valid_to_to?: string;

  @IsEnum(SslSortBy)
  @IsOptional()
  sort_by?: SslSortBy = SslSortBy.VALID_TO;

  @IsEnum(SortOrder)
  @IsOptional()
  sort_order?: SortOrder = SortOrder.ASC;
}
