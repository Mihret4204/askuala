import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
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
import { AttendanceService } from './attendance.service';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { SubmitAttendanceDto } from './dto/submit-attendance.dto';
import { SubmitExcuseDto } from './dto/submit-excuse.dto';
import { ReviewExcuseDto } from './dto/review-excuse.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
@UseGuards(RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ---------------------------------------------------------------------------
  // Session Management
  // ---------------------------------------------------------------------------

  @Post('sessions')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR, UserRole.HOD, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Create a new attendance session for a course offering' })
  @ApiResponse({ status: 201, description: 'Attendance session created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Course offering or related entity not found' })
  @ApiResponse({ status: 409, description: 'Duplicate session for date/time' })
  async createSession(@Body() dto: CreateAttendanceSessionDto) {
    return this.attendanceService.createSession(dto);
  }

  @Get('sessions')
  @Roles(
    UserRole.ADMIN,
    UserRole.REGISTRAR,
    UserRole.FACULTY_DEAN,
    UserRole.HOD,
    UserRole.INSTRUCTOR,
  )
  @ApiOperation({ summary: 'Get all attendance sessions for a specific course offering' })
  @ApiQuery({ name: 'courseOfferingId', required: true, description: 'ID of the course offering' })
  @ApiResponse({ status: 200, description: 'List of attendance sessions' })
  async getSessionsForOffering(@Query('courseOfferingId') courseOfferingId: string) {
    return this.attendanceService.getSessionsForOffering(courseOfferingId);
  }

  @Get('sessions/:id')
  @Roles(
    UserRole.ADMIN,
    UserRole.REGISTRAR,
    UserRole.FACULTY_DEAN,
    UserRole.HOD,
    UserRole.INSTRUCTOR,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get a single attendance session with all records' })
  @ApiParam({ name: 'id', description: 'Attendance session UUID' })
  @ApiResponse({ status: 200, description: 'Attendance session with records' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionWithRecords(@Param('id') id: string) {
    return this.attendanceService.getSessionWithRecords(id);
  }

  // ---------------------------------------------------------------------------
  // Roll-Call Submission
  // ---------------------------------------------------------------------------

  @Patch('sessions/:id/submit')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Submit (or update) roll-call for an attendance session' })
  @ApiParam({ name: 'id', description: 'Attendance session UUID' })
  @ApiResponse({ status: 200, description: 'Attendance submitted and session marked SUBMITTED' })
  @ApiResponse({ status: 400, description: 'Session is locked or invalid enrollment IDs' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async submitAttendance(
    @Param('id') id: string,
    @Body() dto: SubmitAttendanceDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.attendanceService.submitAttendance(id, dto, userId);
  }

  // ---------------------------------------------------------------------------
  // Excuse Management
  // ---------------------------------------------------------------------------

  @Post('records/:recordId/excuse')
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Submit an absence excuse for an attendance record' })
  @ApiParam({ name: 'recordId', description: 'Attendance record UUID' })
  @ApiResponse({ status: 201, description: 'Excuse submitted successfully' })
  @ApiResponse({ status: 400, description: 'Record is not ABSENT or excuse already exists' })
  @ApiResponse({ status: 404, description: 'Attendance record not found' })
  async submitExcuse(
    @Param('recordId') recordId: string,
    @Body() dto: SubmitExcuseDto,
  ) {
    return this.attendanceService.submitExcuse(recordId, dto);
  }

  @Patch('excuses/:excuseId/review')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR, UserRole.HOD, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Review (approve or reject) a submitted excuse' })
  @ApiParam({ name: 'excuseId', description: 'Attendance excuse UUID' })
  @ApiResponse({ status: 200, description: 'Excuse reviewed and status updated' })
  @ApiResponse({ status: 400, description: 'Excuse has already been reviewed' })
  @ApiResponse({ status: 404, description: 'Excuse not found' })
  async reviewExcuse(
    @Param('excuseId') excuseId: string,
    @Body() dto: ReviewExcuseDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.attendanceService.reviewExcuse(excuseId, dto, userId);
  }

  @Get('excuses/pending')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR, UserRole.HOD, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get all pending (unreviewed) absence excuses' })
  @ApiResponse({ status: 200, description: 'List of pending excuses' })
  async getPendingExcuses() {
    return this.attendanceService.getPendingExcuses();
  }

  // ---------------------------------------------------------------------------
  // Student Attendance Summary
  // ---------------------------------------------------------------------------

  @Get('students/:studentId/summary')
  @Roles(
    UserRole.ADMIN,
    UserRole.REGISTRAR,
    UserRole.FACULTY_DEAN,
    UserRole.HOD,
    UserRole.INSTRUCTOR,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get attendance summary for a student' })
  @ApiParam({ name: 'studentId', description: 'Student profile UUID' })
  @ApiQuery({ name: 'semesterId', required: false, description: 'Optional: filter by semester' })
  @ApiResponse({ status: 200, description: 'Attendance summary with percentage' })
  async getStudentSummary(
    @Param('studentId') studentId: string,
    @Query('semesterId') semesterId?: string,
  ) {
    return this.attendanceService.getStudentSummary(studentId, semesterId);
  }
}
