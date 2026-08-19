import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
@Controller('workspaces/:workspaceId/spaces/:spaceId/lists/:listId/tasks/:taskId/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Post()
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCommentDto,
  ) {
    return this.comments.create(workspaceId, spaceId, listId, taskId, user.id, dto);
  }

  @Get()
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.comments.findAll(workspaceId, spaceId, listId, taskId);
  }

  @Delete(':commentId')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.comments.remove(workspaceId, spaceId, listId, taskId, commentId, user.id);
  }
}
