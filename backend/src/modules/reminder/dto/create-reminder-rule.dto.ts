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
import { EVENT_TYPES, REMINDER_CHANNELS } from './create-reminder.dto';

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
