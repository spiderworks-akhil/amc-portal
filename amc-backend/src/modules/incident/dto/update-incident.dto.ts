import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const SEVERITY_VALUES = ['critical', 'major', 'minor', 'info'] as const;

export class UpdateIncidentDto {
  @IsIn(SEVERITY_VALUES)
  @IsOptional()
  severity?: string;

  @IsString()
  @IsOptional()
  cause?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
