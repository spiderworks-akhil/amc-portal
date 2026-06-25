import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;
}
