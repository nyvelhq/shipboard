import { IsArray, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['urgent', 'high', 'normal', 'low'])
  priority?: string;

  @IsOptional()
  @IsUUID()
  statusId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assigneeIds?: string[];

  // Explicit null clears the Task's Sprint (moves it back to the backlog);
  // omitted leaves it unchanged. IsOptional() in class-validator skips
  // validation for both null and undefined, so this is safe as written.
  @IsOptional()
  @IsUUID()
  sprintId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  storyPoints?: number;

  // fieldId -> value. Value shape depends on the field's type (string for
  // text/date/currency, number, boolean for checkbox, string[] for
  // multiselect) — validated loosely here, checked against the field's
  // scope in TasksService.
  @IsOptional()
  @IsObject()
  customFieldValues?: Record<string, unknown>;
}
