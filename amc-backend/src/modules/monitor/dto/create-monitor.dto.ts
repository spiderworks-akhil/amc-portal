import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const MONITOR_TYPES = ['http', 'https', 'tcp', 'ping', 'keyword'] as const;

export class CreateMonitorDto {
  @IsUUID()
  @IsNotEmpty()
  asset_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsIn(MONITOR_TYPES)
  @IsNotEmpty()
  check_type: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  target: string;

  @IsNumber()
  @Min(30)
  @Max(86400)
  @IsOptional()
  interval_seconds?: number = 300;

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
  enabled?: boolean = true;
}
