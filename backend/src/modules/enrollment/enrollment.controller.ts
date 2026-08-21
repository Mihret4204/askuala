import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentStatusDto } from './dto/update-enrollment-status.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Enrollment')
@ApiBearerAuth()
@Controller('enrollments')
@UseGuards(RolesGuard)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR, UserRole.STUDENT)
  async createEnrollment(@Body() dto: CreateEnrollmentDto) {
    return this.enrollmentService.createEnrollment(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR, UserRole.FACULTY_DEAN, UserRole.HOD, UserRole.INSTRUCTOR)
  async findAllEnrollments() {
    return this.enrollmentService.findAllEnrollments();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR, UserRole.FACULTY_DEAN, UserRole.HOD, UserRole.INSTRUCTOR, UserRole.STUDENT)
  async findOneEnrollment(@Param('id') id: string) {
    return this.enrollmentService.findOneEnrollment(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR)
  async updateEnrollmentStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEnrollmentStatusDto,
  ) {
    return this.enrollmentService.updateEnrollmentStatus(id, dto);
  }
}
