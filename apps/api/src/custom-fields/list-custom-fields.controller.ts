import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { ListsService } from '../lists/lists.service';
import { CustomFieldsService } from './custom-fields.service';

// Separate controller (rather than folding into ListsController) so
// ListsModule doesn't need to depend on CustomFieldsService — mirrors how
// TasksModule depends on ListsModule, not the other way around.
@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
@Controller('workspaces/:workspaceId/spaces/:spaceId/lists/:listId/custom-fields')
export class ListCustomFieldsController {
  constructor(
    private readonly lists: ListsService,
    private readonly customFields: CustomFieldsService,
  ) {}

  @Get()
  async findApplicable(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
  ) {
    await this.lists.findOne(workspaceId, spaceId, listId); // ownership-chain check
    return this.customFields.findApplicableToList(workspaceId, spaceId, listId);
  }
}
