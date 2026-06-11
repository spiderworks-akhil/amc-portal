import { IsOptional, IsString, IsInt, Min, IsEnum, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum ClientSortBy {
  NAME = 'name',
  COMPANY = 'company',
  EMAIL = 'email',
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
  IS_ACTIVE = 'is_active',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListClientsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ClientSortBy)
  sort_by?: ClientSortBy = ClientSortBy.NAME;

  @IsOptional()
  @IsEnum(SortOrder)
  sort_order?: SortOrder = SortOrder.ASC;
}
