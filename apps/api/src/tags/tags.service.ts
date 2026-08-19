import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  create(workspaceId: string, dto: CreateTagDto) {
    return this.prisma.tag.create({
      data: { workspaceId, name: dto.name, color: dto.color },
    });
  }

  findAll(workspaceId: string) {
    return this.prisma.tag.findMany({ where: { workspaceId }, orderBy: { name: 'asc' } });
  }

  async remove(workspaceId: string, tagId: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag || tag.workspaceId !== workspaceId) {
      throw new NotFoundException('Tag not found.');
    }
    await this.prisma.tag.delete({ where: { id: tagId } });
    return { ok: true };
  }
}
