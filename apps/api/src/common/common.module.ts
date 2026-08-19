import { Global, Module } from '@nestjs/common';
import { WorkspaceMembershipGuard } from './guards/workspace-membership.guard';
import { TaskOwnershipGuard } from './guards/task-ownership.guard';

@Global()
@Module({
  providers: [WorkspaceMembershipGuard, TaskOwnershipGuard],
  exports: [WorkspaceMembershipGuard, TaskOwnershipGuard],
})
export class CommonModule {}
