import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators';
import { LawyersService } from './lawyers.service';

@ApiTags('lawyers')
@Public()
@Controller('lawyers')
export class LawyersController {
  constructor(private readonly lawyers: LawyersService) {}

  @Get()
  @ApiOperation({ summary: 'Хуульчдын нийтийн жагсаалт' })
  findAll() {
    return this.lawyers.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Хуульчийн дэлгэрэнгүй (profile id эсвэл user id)' })
  findOne(@Param('id') id: string) {
    return this.lawyers.findOne(id);
  }
}
