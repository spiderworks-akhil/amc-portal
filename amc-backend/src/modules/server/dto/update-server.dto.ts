import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateServerDto {
  @IsUUID()
  @IsOptional()
  provider_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  label?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ip_addresses?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(255)
  region?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  operating_system?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  panel_url?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  monthly_cost?: number;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  @IsDateString()
  @IsOptional()
  renewal_date?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  notes?: string;
}
