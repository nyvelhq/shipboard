import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { AcceptanceCriteriaService } from './acceptance-criteria.service';
import { CreateAcceptanceCriterionDto } from './dto/create-acceptance-criterion.dto';
import { UpdateAcceptanceCriterionDto } from './dto/update-acceptance-criterion.dto';

@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
@Controller('workspaces/:workspaceId/spaces/:spaceId/lists/:listId/tasks/:taskId/acceptance-criteria')
export class AcceptanceCriteriaController {
  constructor(private readonly acceptanceCriteria: AcceptanceCriteriaService) {}

  @Post()
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateAcceptanceCriterionDto,
  ) {
    return this.acceptanceCriteria.create(workspaceId, spaceId, listId, taskId, dto);
  }

  @Get()
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.acceptanceCriteria.findAll(workspaceId, spaceId, listId, taskId);
  }

  @Patch(':criterionId')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @Param('criterionId') criterionId: string,
    @Body() dto: UpdateAcceptanceCriterionDto,
  ) {
    return this.acceptanceCriteria.update(workspaceId, spaceId, listId, taskId, criterionId, dto);
  }

  @Delete(':criterionId')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @Param('criterionId') criterionId: string,
  ) {
    return this.acceptanceCriteria.remove(workspaceId, spaceId, listId, taskId, criterionId);
  }
}
