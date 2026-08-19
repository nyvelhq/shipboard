import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

@Injectable()
export class SpacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateSpaceDto) {
    const position = await this.prisma.space.count({ where: { workspaceId } });
    return this.prisma.space.create({
      data: { workspaceId, name: dto.name, icon: dto.icon, position },
    });
  }

  findAll(workspaceId: string) {
    return this.prisma.space.findMany({ where: { workspaceId }, orderBy: { position: 'asc' } });
  }

  async findOne(workspaceId: string, spaceId: string) {
    const space = await this.prisma.space.findUnique({ where: { id: spaceId } });
    // A missing space and a space that belongs to a different workspace both
    // 404 identically — never confirm to a caller that a space exists
    // somewhere they're not a member of.
    if (!space || space.workspaceId !== workspaceId) {
      throw new NotFoundException('Space not found.');
    }
    return space;
  }

  async update(workspaceId: string, spaceId: string, dto: UpdateSpaceDto) {
    await this.findOne(workspaceId, spaceId);
    return this.prisma.space.update({ where: { id: spaceId }, data: dto });
  }

  async remove(workspaceId: string, spaceId: string) {
    await this.findOne(workspaceId, spaceId);
    await this.prisma.space.delete({ where: { id: spaceId } });
    return { ok: true };
  }
}
