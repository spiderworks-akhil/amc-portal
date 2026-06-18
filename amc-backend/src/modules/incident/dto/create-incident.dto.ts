import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const SEVERITY_VALUES = ['critical', 'major', 'minor', 'info'] as const;

export class CreateIncidentDto {
  @IsUUID()
  @IsNotEmpty()
  monitor_id: string;

  @IsIn(SEVERITY_VALUES)
  @IsNotEmpty()
  severity: string;

  @IsString()
  @IsOptional()
  cause?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
