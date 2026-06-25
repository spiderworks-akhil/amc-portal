import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum DomainSortBy {
  FQDN = 'fqdn',
  ASSET_NAME = 'asset_name',
  EXPIRY_DATE = 'expiry_date',
  REGISTERED_DATE = 'registered_date',
  AUTO_RENEW = 'auto_renew',
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum DomainStatusFilter {
  ALL = 'all',
  ACTIVE = 'active',
  EXPIRING_SOON = 'expiring_soon',
  EXPIRED = 'expired',
}

export class ListDomainsDto {
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

  @IsUUID()
  @IsOptional()
  client_id?: string;

  @IsUUID()
  @IsOptional()
  registrar_id?: string;

  @IsDateString()
  @IsOptional()
  expiry_date_from?: string;

  @IsDateString()
  @IsOptional()
  expiry_date_to?: string;

  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    return value === 'true' || value === true;
  })
  @IsBoolean()
  @IsOptional()
  auto_renew?: boolean;

  @IsEnum(DomainSortBy)
  @IsOptional()
  sort_by?: DomainSortBy = DomainSortBy.EXPIRY_DATE;

  @IsEnum(SortOrder)
  @IsOptional()
  sort_order?: SortOrder = SortOrder.ASC;

  @IsEnum(DomainStatusFilter)
  @IsOptional()
  status?: DomainStatusFilter = DomainStatusFilter.ALL;
}
