import { Module } from '@nestjs/common';
import { AcceptanceCriteriaController } from './acceptance-criteria.controller';
import { AcceptanceCriteriaService } from './acceptance-criteria.service';
import { TasksModule } from '../tasks/tasks.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [TasksModule, RealtimeModule],
  controllers: [AcceptanceCriteriaController],
  providers: [AcceptanceCriteriaService],
})
export class AcceptanceCriteriaModule {}
