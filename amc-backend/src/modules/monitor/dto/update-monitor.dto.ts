import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const MONITOR_TYPES = ['http', 'https', 'tcp', 'ping', 'keyword'] as const;

export class UpdateMonitorDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsUUID()
  @IsOptional()
  asset_id?: string;

  @IsIn(MONITOR_TYPES)
  @IsOptional()
  check_type?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  target?: string;

  @IsNumber()
  @IsOptional()
  @Min(30)
  @Max(86400)
  interval_seconds?: number;

  @IsNumber()
  @IsOptional()
  @Min(100)
  @Max(599)
  expected_status_code?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  expected_keyword?: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
