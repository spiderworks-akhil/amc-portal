import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateDomainDto {
  @IsUUID()
  @IsNotEmpty()
  asset_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fqdn: string;

  @IsUUID()
  @IsOptional()
  registrar_id?: string;

  @IsDateString()
  @IsOptional()
  registered_date?: string;

  @IsDateString()
  @IsOptional()
  expiry_date?: string;

  @IsBoolean()
  @IsOptional()
  auto_renew?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  nameservers?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  notes?: string;
}
