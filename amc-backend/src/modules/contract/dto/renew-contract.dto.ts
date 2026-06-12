import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class RenewContractDto {
  @IsDateString()
  @IsNotEmpty()
  new_start_date: string;

  @IsDateString()
  @IsNotEmpty()
  new_end_date: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  notes?: string;
}
