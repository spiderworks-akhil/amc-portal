import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { BillingCycle } from 'src/db/types/enums';

export class UpdateContractDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  contract_number?: string;

  @IsEnum(BillingCycle)
  @IsOptional()
  billing_cycle?: BillingCycle;

  @IsDateString()
  @IsOptional()
  start_date?: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  @IsDateString()
  @IsOptional()
  renewal_date?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  @IsBoolean()
  @IsOptional()
  auto_renew?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  scope?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  status?: string;
}
