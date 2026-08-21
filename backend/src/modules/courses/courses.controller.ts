import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { AddPrerequisiteDto } from './dto/add-prerequisite.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Courses')
@ApiBearerAuth()
@Controller('courses')
@UseGuards(RolesGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR, UserRole.HOD)
  async createCourse(@Body() dto: CreateCourseDto) {
    return this.coursesService.createCourse(dto);
  }

  @Public()
  @Get()
  async findAllCourses() {
    return this.coursesService.findAllCourses();
  }

  @Public()
  @Get(':id')
  async findOneCourse(@Param('id') id: string) {
    return this.coursesService.findOneCourse(id);
  }

  @Post(':id/prerequisites')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR, UserRole.HOD)
  async addPrerequisite(@Param('id') id: string, @Body() dto: AddPrerequisiteDto) {
    return this.coursesService.addPrerequisite(id, dto);
  }
}
