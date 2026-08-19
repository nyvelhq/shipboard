import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const FIELD_TYPES = ['text', 'number', 'currency', 'dropdown', 'multiselect', 'date', 'checkbox', 'person'];

export class CreateCustomFieldDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(FIELD_TYPES)
  type!: string;

  @IsOptional()
  options?: string[];

  @IsOptional()
  @IsString()
  spaceId?: string;

  @IsOptional()
  @IsString()
  listId?: string;
}
