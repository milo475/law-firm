import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@law-firm/shared';
import { CurrentUser, Roles } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import {
  AssignServiceRequestDto,
  CreateServiceRequestDto,
  RejectServiceRequestDto,
  ServiceRequestPageDto,
  ServiceRequestQueryDto,
} from './dto/service-requests.dto';
import { ServiceRequestsService } from './service-requests.service';

@ApiTags('service-requests')
@ApiBearerAuth()
@Controller('service-requests')
export class ServiceRequestsController {
  constructor(private readonly requests: ServiceRequestsService) {}

  @Roles(Role.CLIENT)
  @Post()
  @ApiOperation({ summary: '[CLIENT] Өмгөөлөгч авах / зөвлөгөө авах хүсэлт гаргах (NEW, админуудад мэдэгдэл)' })
  create(@Body() dto: CreateServiceRequestDto, @CurrentUser() user: RequestUser) {
    return this.requests.create(dto, user);
  }

  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: '[ADMIN] Бүх хүсэлт — status, type, caseType шүүлт, хуудаслалт' })
  findAll(@Query() query: ServiceRequestQueryDto) {
    return this.requests.findAll(query);
  }

  @Roles(Role.ADMIN)
  @Get('summary')
  @ApiOperation({ summary: '[ADMIN] Шинэ болон хүлээж авсан хүсэлтийн тоо (sidebar badge)' })
  summary() {
    return this.requests.summary();
  }

  @Roles(Role.CLIENT)
  @Get('mine')
  @ApiOperation({ summary: '[CLIENT] Өөрийн хүсэлтүүд' })
  mine(@Query() query: ServiceRequestPageDto, @CurrentUser() user: RequestUser) {
    return this.requests.findMine(query, user);
  }

  @Roles(Role.ADMIN, Role.CLIENT)
  @Get(':id')
  @ApiOperation({ summary: 'Хүсэлтийн дэлгэрэнгүй (ADMIN бүгд, CLIENT зөвхөн өөрийн)' })
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.requests.findOne(id, user);
  }

  @Roles(Role.ADMIN)
  @Get(':id/suggested-lawyers')
  @ApiOperation({ summary: '[ADMIN] Хүсэлтийн чиглэлд мэргэшсэн идэвхтэй өмгөөлөгчид (таарах хүн байхгүй бол бүгд)' })
  suggestedLawyers(@Param('id') id: string) {
    return this.requests.suggestedLawyers(id);
  }

  @Roles(Role.ADMIN)
  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] NEW → ACCEPTED (хүсэлт гаргагчид мэдэгдэл)' })
  accept(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.requests.accept(id, user);
  }

  @Roles(Role.ADMIN)
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] NEW/ACCEPTED → REJECTED, шалтгаан заавал (хүсэлт гаргагчид мэдэгдэл)' })
  reject(@Param('id') id: string, @Body() dto: RejectServiceRequestDto, @CurrentUser() user: RequestUser) {
    return this.requests.reject(id, dto, user);
  }

  @Roles(Role.ADMIN)
  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] ACCEPTED → CONVERTED: нэг өмгөөлөгч эсвэл баг хуваарилж хэрэг нээнэ' })
  assign(@Param('id') id: string, @Body() dto: AssignServiceRequestDto, @CurrentUser() user: RequestUser) {
    return this.requests.assign(id, dto, user);
  }
}
