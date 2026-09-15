import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminStatsService } from './admin-stats.service';

@Module({
  controllers: [AdminController],
  providers: [AdminStatsService],
})
export class AdminModule {}
