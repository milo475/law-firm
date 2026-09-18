import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@law-firm/shared';
import { CurrentUser, Public, Roles } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { CreateTestimonialDto, PublicTestimonialQueryDto } from './dto/testimonials.dto';
import { TestimonialsService } from './testimonials.service';

@ApiTags('testimonials')
@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly testimonials: TestimonialsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Нийтэлсэн сэтгэгдлүүд (caseType, featured, limit) — зөвхөн PUBLISHED' })
  findPublic(@Query() query: PublicTestimonialQueryDto) {
    return this.testimonials.findPublic(query);
  }

  @ApiBearerAuth()
  @Roles(Role.CLIENT)
  @Get('mine')
  @ApiOperation({ summary: '[CLIENT] Өөрийн үлдээсэн сэтгэгдлүүд, төлөвтэйгээ' })
  mine(@CurrentUser() user: RequestUser) {
    return this.testimonials.findMine(user);
  }

  @ApiBearerAuth()
  @Roles(Role.CLIENT)
  @Post()
  @ApiOperation({ summary: '[CLIENT] Хаагдсан хэргийн талаар сэтгэгдэл үлдээх (PENDING, ажилтнуудад мэдэгдэл)' })
  create(@Body() dto: CreateTestimonialDto, @CurrentUser() user: RequestUser) {
    return this.testimonials.create(dto, user);
  }

  @ApiBearerAuth()
  @Roles(Role.CLIENT)
  @Post(':id/revoke-consent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[CLIENT] Нийтлэх зөвшөөрлөө цуцлах — сэтгэгдэл сайтаас шууд алга болно' })
  revokeConsent(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.testimonials.revokeConsent(id, user);
  }
}
