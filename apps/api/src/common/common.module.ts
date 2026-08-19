import { Global, Module } from '@nestjs/common';
import { WorkspaceMembershipGuard } from './guards/workspace-membership.guard';

@Global()
@Module({
  providers: [WorkspaceMembershipGuard],
  exports: [WorkspaceMembershipGuard],
})
export class CommonModule {}
