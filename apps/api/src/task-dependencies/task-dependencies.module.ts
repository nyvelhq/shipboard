import { Module } from '@nestjs/common';
import { TaskDependenciesController } from './task-dependencies.controller';
import { TaskDependenciesService } from './task-dependencies.service';
import { TasksModule } from '../tasks/tasks.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [TasksModule, RealtimeModule],
  controllers: [TaskDependenciesController],
  providers: [TaskDependenciesService],
})
export class TaskDependenciesModule {}
