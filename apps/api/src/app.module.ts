import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { SpacesModule } from './spaces/spaces.module';
import { FoldersModule } from './folders/folders.module';
import { ListsModule } from './lists/lists.module';
import { TasksModule } from './tasks/tasks.module';
import { HealthController } from './health.controller';

// Sprints, CustomFields, Comments, Attachments modules are Week 5-8 work
// per HANDOFF.md — not stubbed here for the same reason nothing else in
// this scaffold is: no fake-finished code to unwind later.
@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AuthModule,
    WorkspacesModule,
    SpacesModule,
    FoldersModule,
    ListsModule,
    TasksModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
