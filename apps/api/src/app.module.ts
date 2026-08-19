import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { SpacesModule } from './spaces/spaces.module';
import { FoldersModule } from './folders/folders.module';
import { ListsModule } from './lists/lists.module';
import { HealthController } from './health.controller';

// Sprints, Tasks, CustomFields, Comments, Attachments modules are Week 3-8
// work per HANDOFF.md — not stubbed here for the same reason nothing else
// in this scaffold is: no fake-finished code to unwind later.
@Module({
  imports: [PrismaModule, CommonModule, AuthModule, WorkspacesModule, SpacesModule, FoldersModule, ListsModule],
  controllers: [HealthController],
})
export class AppModule {}
