import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { SslType } from 'src/db/types/enums';

export class UpdateSslDto {
  @IsUUID()
  @IsOptional()
  domain_id?: string;

  @IsUUID()
  @IsOptional()
  asset_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  issuer?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  common_name?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sans?: string[];

  @IsDateString()
  @IsOptional()
  valid_from?: string;

  @IsDateString()
  @IsOptional()
  valid_to?: string;

  @IsEnum(SslType)
  @IsOptional()
  type?: SslType;
}
