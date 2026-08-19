import { Module } from '@nestjs/common';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';
import { SpacesModule } from '../spaces/spaces.module';

@Module({
  imports: [SpacesModule],
  controllers: [FoldersController],
  providers: [FoldersService],
})
export class FoldersModule {}
