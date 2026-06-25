import { IsArray, IsNotEmpty, IsUUID, ArrayMinSize } from 'class-validator';

export class ManagerIdsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @IsNotEmpty()
  manager_ids: string[];
}

export class AddManagersDto extends ManagerIdsDto {
  @IsUUID()
  @IsNotEmpty()
  client_id: string;
}

export class RemoveManagersDto extends ManagerIdsDto {
  @IsUUID()
  @IsNotEmpty()
  client_id: string;
}
