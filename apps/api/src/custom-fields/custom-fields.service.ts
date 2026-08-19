import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';

@Injectable()
export class CustomFieldsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateCustomFieldDto) {
    if (dto.spaceId) {
      const space = await this.prisma.space.findUnique({ where: { id: dto.spaceId } });
      if (!space || space.workspaceId !== workspaceId) {
        throw new BadRequestException('spaceId does not belong to this Workspace.');
      }
    }
    if (dto.listId) {
      const list = await this.prisma.list.findUnique({
        where: { id: dto.listId },
        include: { space: true },
      });
      if (!list || list.space.workspaceId !== workspaceId) {
        throw new BadRequestException('listId does not belong to this Workspace.');
      }
      if (dto.spaceId && list.spaceId !== dto.spaceId) {
        throw new BadRequestException('listId does not belong to the given Space.');
      }
    }

    return this.prisma.customField.create({
      data: {
        workspaceId,
        spaceId: dto.spaceId,
        listId: dto.listId,
        name: dto.name,
        type: dto.type,
        options: dto.options,
      },
    });
  }

  findAllForWorkspace(workspaceId: string) {
    return this.prisma.customField.findMany({ where: { workspaceId }, orderBy: { name: 'asc' } });
  }

  // Fields visible on a given List: workspace-wide (spaceId & listId both
  // null), this List's Space (spaceId matches, listId null), or this exact
  // List (listId matches).
  findApplicableToList(workspaceId: string, spaceId: string, listId: string) {
    return this.prisma.customField.findMany({
      where: {
        workspaceId,
        OR: [
          { spaceId: null, listId: null },
          { spaceId, listId: null },
          { listId },
        ],
      },
      orderBy: { name: 'asc' },
    });
  }

  async remove(workspaceId: string, fieldId: string) {
    const field = await this.prisma.customField.findUnique({ where: { id: fieldId } });
    if (!field || field.workspaceId !== workspaceId) {
      throw new NotFoundException('Custom field not found.');
    }
    await this.prisma.customFieldValue.deleteMany({ where: { customFieldId: fieldId } });
    await this.prisma.customField.delete({ where: { id: fieldId } });
    return { ok: true };
  }
}
