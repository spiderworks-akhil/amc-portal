import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const EVENT_TYPES = [
  'domain_expiry',
  'ssl_expiry',
  'contract_expiry',
  'server_expiry',
  'incident',
] as const;

export const REMINDER_CHANNELS = ['email', 'whatsapp', 'sms'] as const;

export class CreateReminderRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsIn(EVENT_TYPES)
  @IsNotEmpty()
  event_type: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  trigger_days: number[];

  @IsArray()
  @IsString({ each: true })
  @IsIn(REMINDER_CHANNELS, { each: true })
  @IsNotEmpty()
  channels: string[];

  @IsOptional()
  recipients?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
