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
import { ContractStatus } from 'src/db/types/enums';

export enum ContractSortBy {
  CONTRACT_NUMBER = 'contract_number',
  CLIENT_NAME = 'client_name',
  START_DATE = 'start_date',
  END_DATE = 'end_date',
  RENEWAL_DATE = 'renewal_date',
  AMOUNT = 'amount',
  STATUS = 'status',
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListContractsDto {
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
  client_id?: string;

  @IsUUID()
  @IsOptional()
  asset_id?: string;

  @IsEnum(ContractStatus)
  @IsOptional()
  status?: ContractStatus;

  @IsDateString()
  @IsOptional()
  start_date_from?: string;

  @IsDateString()
  @IsOptional()
  start_date_to?: string;

  @IsDateString()
  @IsOptional()
  end_date_from?: string;

  @IsDateString()
  @IsOptional()
  end_date_to?: string;

  @IsDateString()
  @IsOptional()
  renewal_date_from?: string;

  @IsDateString()
  @IsOptional()
  renewal_date_to?: string;

  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    return value === 'true' || value === true;
  })
  @IsBoolean()
  @IsOptional()
  auto_renew?: boolean;

  @IsEnum(ContractSortBy)
  @IsOptional()
  sort_by?: ContractSortBy = ContractSortBy.END_DATE;

  @IsEnum(SortOrder)
  @IsOptional()
  sort_order?: SortOrder = SortOrder.ASC;
}
