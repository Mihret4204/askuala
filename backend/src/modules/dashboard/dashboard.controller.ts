import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('system')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR, UserRole.FACULTY_DEAN)
  @ApiOperation({ summary: 'Get system-wide overview for administrators' })
  @ApiResponse({ status: 200, description: 'System overview with counts and current semester stats' })
  async getSystemOverview() {
    return this.dashboardService.getSystemOverview();
  }

  @Get('student/:studentId')
  @Roles(
    UserRole.ADMIN,
    UserRole.REGISTRAR,
    UserRole.FACULTY_DEAN,
    UserRole.HOD,
    UserRole.INSTRUCTOR,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get dashboard data for a specific student' })
  @ApiParam({ name: 'studentId', description: 'Student profile UUID' })
  @ApiResponse({ status: 200, description: 'Student dashboard with enrollments, attendance, and grade counts' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getStudentDashboard(@Param('studentId') studentId: string) {
    return this.dashboardService.getStudentDashboard(studentId);
  }

  @Get('instructor/:instructorId')
  @Roles(
    UserRole.ADMIN,
    UserRole.REGISTRAR,
    UserRole.FACULTY_DEAN,
    UserRole.HOD,
    UserRole.INSTRUCTOR,
  )
  @ApiOperation({ summary: 'Get dashboard data for a specific instructor' })
  @ApiParam({ name: 'instructorId', description: 'Instructor profile UUID' })
  @ApiResponse({ status: 200, description: 'Instructor dashboard with offerings and pending action counts' })
  @ApiResponse({ status: 404, description: 'Instructor not found' })
  async getInstructorDashboard(@Param('instructorId') instructorId: string) {
    return this.dashboardService.getInstructorDashboard(instructorId);
  }
}
