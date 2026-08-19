import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SpacesService } from '../spaces/spaces.service';
import { CreateListDto } from './dto/create-list.dto';

const DEFAULT_STATUSES = [
  { name: 'Open', color: '#e74c3c', category: 'todo', position: 0 },
  { name: 'In Progress', color: '#f1c40f', category: 'in_progress', position: 1 },
  { name: 'Review', color: '#3498db', category: 'in_progress', position: 2 },
  { name: 'Done', color: '#2ecc71', category: 'done', position: 3 },
];

@Injectable()
export class ListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spaces: SpacesService,
  ) {}

  async create(workspaceId: string, spaceId: string, dto: CreateListDto) {
    await this.spaces.findOne(workspaceId, spaceId);

    if (dto.folderId) {
      const folder = await this.prisma.folder.findUnique({ where: { id: dto.folderId } });
      if (!folder || folder.spaceId !== spaceId) {
        throw new NotFoundException('Folder not found in this Space.');
      }
    }

    const position = await this.prisma.list.count({ where: { spaceId } });

    // Every List ships with a default 4-status workflow so it's usable
    // immediately (PRD 2.1) — teams reconfigure per-List statuses later.
    return this.prisma.list.create({
      data: {
        spaceId,
        folderId: dto.folderId,
        name: dto.name,
        type: dto.type ?? 'list',
        position,
        statuses: { create: DEFAULT_STATUSES },
      },
      include: { statuses: { orderBy: { position: 'asc' } } },
    });
  }

  async findAll(workspaceId: string, spaceId: string) {
    await this.spaces.findOne(workspaceId, spaceId);
    return this.prisma.list.findMany({ where: { spaceId }, orderBy: { position: 'asc' } });
  }

  async findOne(workspaceId: string, spaceId: string, listId: string) {
    await this.spaces.findOne(workspaceId, spaceId);
    const list = await this.prisma.list.findUnique({
      where: { id: listId },
      include: { statuses: { orderBy: { position: 'asc' } } },
    });
    if (!list || list.spaceId !== spaceId) {
      throw new NotFoundException('List not found.');
    }
    return list;
  }
}
