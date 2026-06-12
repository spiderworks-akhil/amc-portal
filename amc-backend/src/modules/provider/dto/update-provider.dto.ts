import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProviderType } from '../../../db/types/enums';

export class UpdateProviderDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsEnum(ProviderType)
  @IsOptional()
  type?: ProviderType;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  website?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  notes?: string;
}
