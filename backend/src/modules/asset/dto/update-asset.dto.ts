import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const ASSET_STATUSES = ['live', 'staging', 'development', 'parked'] as const;

export class UpdateAssetDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsIn(ASSET_STATUSES)
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  primary_contact_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  primary_contact_email?: string;

  @IsBoolean()
  @IsOptional()
  monitoring_enabled?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tech_stack?: string[];

  @IsOptional()
  custom_fields?: Record<string, unknown>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  notes?: string;
}
