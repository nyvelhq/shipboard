import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';

@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
@Controller('workspaces/:workspaceId/spaces/:spaceId/folders')
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  @Post()
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Body() dto: CreateFolderDto,
  ) {
    return this.folders.create(workspaceId, spaceId, dto);
  }

  @Get()
  findAll(@Param('workspaceId') workspaceId: string, @Param('spaceId') spaceId: string) {
    return this.folders.findAll(workspaceId, spaceId);
  }

  @Get(':folderId')
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('folderId') folderId: string,
  ) {
    return this.folders.findOne(workspaceId, spaceId, folderId);
  }

  @Delete(':folderId')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('folderId') folderId: string,
  ) {
    return this.folders.remove(workspaceId, spaceId, folderId);
  }
}
