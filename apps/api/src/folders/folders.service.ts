import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SpacesService } from '../spaces/spaces.service';
import { CreateFolderDto } from './dto/create-folder.dto';

@Injectable()
export class FoldersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spaces: SpacesService,
  ) {}

  async create(workspaceId: string, spaceId: string, dto: CreateFolderDto) {
    await this.spaces.findOne(workspaceId, spaceId); // 404s if spaceId isn't in this workspace
    const position = await this.prisma.folder.count({ where: { spaceId } });
    return this.prisma.folder.create({ data: { spaceId, name: dto.name, position } });
  }

  async findAll(workspaceId: string, spaceId: string) {
    await this.spaces.findOne(workspaceId, spaceId);
    return this.prisma.folder.findMany({ where: { spaceId }, orderBy: { position: 'asc' } });
  }

  async findOne(workspaceId: string, spaceId: string, folderId: string) {
    await this.spaces.findOne(workspaceId, spaceId);
    const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder || folder.spaceId !== spaceId) {
      throw new NotFoundException('Folder not found.');
    }
    return folder;
  }

  async remove(workspaceId: string, spaceId: string, folderId: string) {
    await this.findOne(workspaceId, spaceId, folderId);
    await this.prisma.folder.delete({ where: { id: folderId } });
    return { ok: true };
  }
}
