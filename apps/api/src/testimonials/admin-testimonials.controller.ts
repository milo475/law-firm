import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@law-firm/shared';
import { CurrentUser, Roles } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { CreateManualTestimonialDto, TestimonialQueryDto, UpdateTestimonialDto } from './dto/testimonials.dto';
import { TestimonialsService } from './testimonials.service';

@ApiTags('testimonials')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.LAWYER)
@Controller('admin/testimonials')
export class AdminTestimonialsController {
  constructor(private readonly testimonials: TestimonialsService) {}

  @Get()
  @ApiOperation({ summary: '[ADMIN, LAWYER] Бүх сэтгэгдэл — status, source, caseType шүүлт; хянагдаагүй нь эхэндээ' })
  findAll(@Query() query: TestimonialQueryDto) {
    return this.testimonials.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN, LAWYER] Сэтгэгдлийн дэлгэрэнгүй' })
  findOne(@Param('id') id: string) {
    return this.testimonials.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '[ADMIN, LAWYER] Гаднаас ирсэн сэтгэгдлийг гараар нэмэх (MANUAL, PENDING)' })
  create(@Body() dto: CreateManualTestimonialDto, @CurrentUser() user: RequestUser) {
    return this.testimonials.createManual(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[ADMIN, LAWYER] Засах, төлөв солих, эрэмбэлэх, онцлох. Нийтлэхэд зөвшөөрөл шаардана' })
  update(@Param('id') id: string, @Body() dto: UpdateTestimonialDto, @CurrentUser() user: RequestUser) {
    return this.testimonials.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[ADMIN, LAWYER] Сэтгэгдлийг устгах' })
  remove(@Param('id') id: string) {
    return this.testimonials.remove(id);
  }
}
