import { IsEnum, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AssetType } from 'src/db/types/enums';

export enum AssetSortBy {
  NAME = 'name',
  STATUS = 'status',
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListAssetsDto {
  @Type(() => Number)
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @Min(1)
  @IsOptional()
  limit?: number = 50;

  @IsString()
  @IsOptional()
  search?: string;

  @IsUUID()
  @IsOptional()
  client_id?: string;

  @IsEnum(AssetType)
  @IsOptional()
  type?: AssetType;

  @IsString()
  @IsOptional()
  status?: string;

  @IsEnum(AssetSortBy)
  @IsOptional()
  sort_by?: AssetSortBy = AssetSortBy.NAME;

  @IsEnum(SortOrder)
  @IsOptional()
  sort_order?: SortOrder = SortOrder.ASC;
}
