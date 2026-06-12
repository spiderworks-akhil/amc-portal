import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProviderType } from '../../../db/types/enums';

export class CreateProviderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsEnum(ProviderType)
  @IsNotEmpty()
  type: ProviderType;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  website?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  notes?: string;
}
