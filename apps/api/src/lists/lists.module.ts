import { Module } from '@nestjs/common';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';
import { SpacesModule } from '../spaces/spaces.module';

@Module({
  imports: [SpacesModule],
  controllers: [ListsController],
  providers: [ListsService],
})
export class ListsModule {}
