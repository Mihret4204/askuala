import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CourseOfferingsService } from './course-offerings.service';
import { CreateCourseOfferingDto } from './dto/create-course-offering.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Course Offerings')
@ApiBearerAuth()
@Controller('course-offerings')
@UseGuards(RolesGuard)
export class CourseOfferingsController {
  constructor(private readonly courseOfferingsService: CourseOfferingsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR, UserRole.HOD)
  async createCourseOffering(@Body() dto: CreateCourseOfferingDto) {
    return this.courseOfferingsService.createCourseOffering(dto);
  }

  @Public()
  @Get()
  async findAllCourseOfferings() {
    return this.courseOfferingsService.findAllCourseOfferings();
  }

  @Public()
  @Get(':id')
  async findOneCourseOffering(@Param('id') id: string) {
    return this.courseOfferingsService.findOneCourseOffering(id);
  }
}
