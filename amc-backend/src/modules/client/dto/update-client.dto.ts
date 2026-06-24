import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateClientDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  notes?: string;
}
