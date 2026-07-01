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
import { BillingCycle } from 'src/db/types/enums';

export class CreateContractDto {
  @IsUUID()
  @IsNotEmpty()
  client_id: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  label?: string;

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
  @IsOptional()
  end_date?: string;

  @IsDateString()
  @IsOptional()
  renewal_date?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
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
