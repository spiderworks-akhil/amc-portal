import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
  IsUUID,
} from 'class-validator';

export class ContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  designation?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @IsBoolean()
  @IsOptional()
  is_primary?: boolean;

  @IsBoolean()
  @IsOptional()
  should_send_notification?: boolean;

  @IsBoolean()
  @IsOptional()
  should_send_wp_notification?: boolean;

  @IsUUID()
  @IsOptional()
  client_id?: string;
}

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  designation?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @IsBoolean()
  @IsOptional()
  is_primary?: boolean;

  @IsBoolean()
  @IsOptional()
  should_send_notification?: boolean;

  @IsBoolean()
  @IsOptional()
  should_send_wp_notification?: boolean;
}

export class AddContactsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  @ArrayMinSize(1)
  @IsNotEmpty()
  contacts: ContactDto[];
}

export class UpdateContactDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  designation?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @IsBoolean()
  @IsOptional()
  is_primary?: boolean;

  @IsBoolean()
  @IsOptional()
  should_send_notification?: boolean;

  @IsBoolean()
  @IsOptional()
  should_send_wp_notification?: boolean;
}
