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

  // ── Template names ──

  @IsString()
  @IsOptional()
  @MaxLength(255)
  domain_created_template?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  ssl_created_template?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  server_created_template?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  incident_created_template?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  domain_expiry_template?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  ssl_expiry_template?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  server_expiry_template?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  contract_expiry_template?: string;
}
