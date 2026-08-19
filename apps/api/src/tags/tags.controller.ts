import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ELEVATED_ROLES } from '../common/roles';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';

@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
@Controller('workspaces/:workspaceId/tags')
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Post()
  create(@Param('workspaceId') workspaceId: string, @Body() dto: CreateTagDto) {
    return this.tags.create(workspaceId, dto);
  }

  @Get()
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.tags.findAll(workspaceId);
  }

  @Delete(':tagId')
  @UseGuards(RolesGuard)
  @Roles(...ELEVATED_ROLES)
  remove(@Param('workspaceId') workspaceId: string, @Param('tagId') tagId: string) {
    return this.tags.remove(workspaceId, tagId);
  }
}
