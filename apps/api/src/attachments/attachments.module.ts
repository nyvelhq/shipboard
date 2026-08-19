import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { TasksModule } from '../tasks/tasks.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [TasksModule, RealtimeModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}
