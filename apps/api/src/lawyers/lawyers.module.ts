import { Module } from '@nestjs/common';
import { LawyersController } from './lawyers.controller';
import { LawyersService } from './lawyers.service';

@Module({
  controllers: [LawyersController],
  providers: [LawyersService],
})
export class LawyersModule {}
