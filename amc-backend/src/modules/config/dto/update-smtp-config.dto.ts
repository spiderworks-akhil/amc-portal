import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEmail, MaxLength } from 'class-validator';

export class UpdateSmtpConfigDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  host: string;

  @IsNumber()
  port: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  user: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  password: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  from_email: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  from_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  encryption?: string;
}
