import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { GradesService } from './grades.service';
import { SubmitGradeDto } from './dto/submit-grade.dto';
import { ApproveGradeDto } from './dto/approve-grade.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Grades')
@ApiBearerAuth()
@Controller('grades')
@UseGuards(RolesGuard)
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  // ---------------------------------------------------------------------------
  // Grade Submission (Instructor)
  // ---------------------------------------------------------------------------

  @Post()
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Submit a grade for an enrollment (Instructor)' })
  @ApiResponse({ status: 201, description: 'Grade submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid enrollment status or grade data' })
  @ApiResponse({ status: 403, description: 'Cannot modify approved or published grade' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async submitGrade(
    @Body() dto: SubmitGradeDto,
    @CurrentUser() user: any,
  ) {
    // Pass instructorId from current user's instructor profile
    // The service will use user.id; for instructor-specific lookup the service resolves via the profile
    return this.gradesService.submitGrade(dto, user.id);
  }

  // ---------------------------------------------------------------------------
  // Grade Approval (Registrar / Admin)
  // ---------------------------------------------------------------------------

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Approve or reject a submitted grade' })
  @ApiParam({ name: 'id', description: 'Grade UUID' })
  @ApiResponse({ status: 200, description: 'Grade approval status updated' })
  @ApiResponse({ status: 400, description: 'Grade is not in SUBMITTED status' })
  @ApiResponse({ status: 404, description: 'Grade not found' })
  async approveGrade(
    @Param('id') id: string,
    @Body() dto: ApproveGradeDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.gradesService.approveGrade(id, dto, userId);
  }

  // ---------------------------------------------------------------------------
  // Grade Publishing (Registrar / Admin)
  // ---------------------------------------------------------------------------

  @Patch(':id/publish')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Publish an approved grade (makes it visible to students)' })
  @ApiParam({ name: 'id', description: 'Grade UUID' })
  @ApiResponse({ status: 200, description: 'Grade published and enrollment status updated' })
  @ApiResponse({ status: 400, description: 'Grade must be in APPROVED status to publish' })
  @ApiResponse({ status: 404, description: 'Grade not found' })
  async publishGrade(@Param('id') id: string) {
    return this.gradesService.publishGrade(id);
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  @Get('pending')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Get all grades pending approval (status: SUBMITTED)' })
  @ApiResponse({ status: 200, description: 'List of submitted grades awaiting approval' })
  async findPendingGrades() {
    return this.gradesService.findPendingGrades();
  }

  @Get('enrollment/:enrollmentId')
  @Roles(
    UserRole.ADMIN,
    UserRole.REGISTRAR,
    UserRole.FACULTY_DEAN,
    UserRole.HOD,
    UserRole.INSTRUCTOR,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get grade by enrollment ID' })
  @ApiParam({ name: 'enrollmentId', description: 'Enrollment UUID' })
  @ApiResponse({ status: 200, description: 'Grade for the enrollment' })
  @ApiResponse({ status: 404, description: 'No grade found for this enrollment' })
  async findGradeByEnrollment(@Param('enrollmentId') enrollmentId: string) {
    return this.gradesService.findGradeByEnrollment(enrollmentId);
  }

  @Get('offering/:courseOfferingId')
  @Roles(
    UserRole.ADMIN,
    UserRole.REGISTRAR,
    UserRole.FACULTY_DEAN,
    UserRole.HOD,
    UserRole.INSTRUCTOR,
  )
  @ApiOperation({ summary: 'Get all grades for a course offering' })
  @ApiParam({ name: 'courseOfferingId', description: 'Course offering UUID' })
  @ApiResponse({ status: 200, description: 'List of grades for the offering' })
  async findGradesByOffering(@Param('courseOfferingId') courseOfferingId: string) {
    return this.gradesService.findGradesByOffering(courseOfferingId);
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
  @ApiOperation({ summary: 'Get published grades for a student' })
  @ApiParam({ name: 'studentId', description: 'Student profile UUID' })
  @ApiQuery({ name: 'semesterId', required: false, description: 'Optional: filter by semester' })
  @ApiResponse({ status: 200, description: 'List of published grades for the student' })
  async findGradesByStudent(
    @Param('studentId') studentId: string,
    @Query('semesterId') semesterId?: string,
  ) {
    return this.gradesService.findGradesByStudent(studentId, semesterId);
  }

  @Get('student/:studentId/gpa')
  @Roles(
    UserRole.ADMIN,
    UserRole.REGISTRAR,
    UserRole.FACULTY_DEAN,
    UserRole.HOD,
    UserRole.INSTRUCTOR,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Calculate GPA for a student' })
  @ApiParam({ name: 'studentId', description: 'Student profile UUID' })
  @ApiQuery({ name: 'semesterId', required: false, description: 'Optional: calculate semester GPA only' })
  @ApiResponse({ status: 200, description: 'GPA with credit stats' })
  async calculateGpa(
    @Param('studentId') studentId: string,
    @Query('semesterId') semesterId?: string,
  ) {
    return this.gradesService.calculateGpa(studentId, semesterId);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.REGISTRAR,
    UserRole.FACULTY_DEAN,
    UserRole.HOD,
    UserRole.INSTRUCTOR,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get a grade by its ID' })
  @ApiParam({ name: 'id', description: 'Grade UUID' })
  @ApiResponse({ status: 200, description: 'Grade details' })
  @ApiResponse({ status: 404, description: 'Grade not found' })
  async findGradeById(@Param('id') id: string) {
    return this.gradesService.findGradeById(id);
  }
}
