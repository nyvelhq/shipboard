import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { ListsModule } from '../lists/lists.module';

@Module({
  imports: [ListsModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
