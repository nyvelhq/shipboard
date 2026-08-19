import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { TasksModule } from '../tasks/tasks.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [TasksModule, RealtimeModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
