import {
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateScopeDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(7)
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'color must be a valid hex color (e.g. #6366f1)',
  })
  color?: string;
}
