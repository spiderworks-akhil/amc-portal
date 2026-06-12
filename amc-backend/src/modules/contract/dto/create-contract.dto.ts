import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { BillingCycle } from '../../../db/types/enums';

export class CreateContractDto {
  @IsUUID()
  @IsNotEmpty()
  client_id: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  contract_number?: string;

  @IsEnum(BillingCycle)
  @IsNotEmpty()
  billing_cycle: BillingCycle;

  @IsDateString()
  @IsNotEmpty()
  start_date: string;

  @IsDateString()
  @IsNotEmpty()
  end_date: string;

  @IsDateString()
  @IsNotEmpty()
  renewal_date: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

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
