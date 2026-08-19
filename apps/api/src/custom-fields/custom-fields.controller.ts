import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';
import { CustomFieldsService } from './custom-fields.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';

@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
@Controller('workspaces/:workspaceId/custom-fields')
export class CustomFieldsController {
  constructor(private readonly customFields: CustomFieldsService) {}

  @Post()
  create(@Param('workspaceId') workspaceId: string, @Body() dto: CreateCustomFieldDto) {
    return this.customFields.create(workspaceId, dto);
  }

  @Get()
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.customFields.findAllForWorkspace(workspaceId);
  }

  @Delete(':fieldId')
  remove(@Param('workspaceId') workspaceId: string, @Param('fieldId') fieldId: string) {
    return this.customFields.remove(workspaceId, fieldId);
  }
}
