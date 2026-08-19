import { IsUUID } from 'class-validator';

export class CreateTaskDependencyDto {
  // The task that must finish before the URL's :taskId can start.
  @IsUUID()
  blockingTaskId!: string;
}
