import { IsEnum, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ProviderType } from 'src/db/types/enums';

export enum ProviderSortBy {
  NAME = 'name',
  TYPE = 'type',
  CREATED_AT = 'created_at',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListProvidersDto {
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

  @IsEnum(ProviderType)
  @IsOptional()
  type?: ProviderType;

  @IsEnum(ProviderSortBy)
  @IsOptional()
  sort_by?: ProviderSortBy = ProviderSortBy.NAME;

  @IsEnum(SortOrder)
  @IsOptional()
  sort_order?: SortOrder = SortOrder.ASC;
}
