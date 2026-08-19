import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { SpacesService } from './spaces.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
@Controller('workspaces/:workspaceId/spaces')
export class SpacesController {
  constructor(private readonly spaces: SpacesService) {}

  @Post()
  create(@Param('workspaceId') workspaceId: string, @Body() dto: CreateSpaceDto) {
    return this.spaces.create(workspaceId, dto);
  }

  @Get()
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.spaces.findAll(workspaceId);
  }

  @Get(':spaceId')
  findOne(@Param('workspaceId') workspaceId: string, @Param('spaceId') spaceId: string) {
    return this.spaces.findOne(workspaceId, spaceId);
  }

  @Patch(':spaceId')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Body() dto: UpdateSpaceDto,
  ) {
    return this.spaces.update(workspaceId, spaceId, dto);
  }

  @Delete(':spaceId')
  remove(@Param('workspaceId') workspaceId: string, @Param('spaceId') spaceId: string) {
    return this.spaces.remove(workspaceId, spaceId);
  }
}
