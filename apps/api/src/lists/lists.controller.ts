import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { ListsService } from './lists.service';
import { CreateListDto } from './dto/create-list.dto';

@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
@Controller('workspaces/:workspaceId/spaces/:spaceId/lists')
export class ListsController {
  constructor(private readonly lists: ListsService) {}

  @Post()
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Body() dto: CreateListDto,
  ) {
    return this.lists.create(workspaceId, spaceId, dto);
  }

  @Get()
  findAll(@Param('workspaceId') workspaceId: string, @Param('spaceId') spaceId: string) {
    return this.lists.findAll(workspaceId, spaceId);
  }

  @Get(':listId')
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
  ) {
    return this.lists.findOne(workspaceId, spaceId, listId);
  }
}
