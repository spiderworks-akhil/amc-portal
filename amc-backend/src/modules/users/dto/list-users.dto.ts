import { IsOptional, IsString, IsInt, Min, IsEnum, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum UserSortBy {
  NAME = 'name',
  EMAIL = 'email',
  ROLE = 'role',
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
  IS_ACTIVE = 'is_active',
  LAST_LOGIN_AT = 'last_login_at',
}

export enum UserSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListUsersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserSortBy)
  sort_by?: UserSortBy = UserSortBy.NAME;

  @IsOptional()
  @IsEnum(UserSortOrder)
  sort_order?: UserSortOrder = UserSortOrder.ASC;
}
