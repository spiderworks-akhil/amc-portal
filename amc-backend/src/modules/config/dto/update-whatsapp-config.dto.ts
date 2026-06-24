import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class UpdateWhatsAppConfigDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  api_key: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  api_secret?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  phone_number_id: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  business_account_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  webhook_verify_token?: string;
}
