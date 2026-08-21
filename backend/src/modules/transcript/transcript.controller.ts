import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TranscriptService } from './transcript.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Transcript')
@ApiBearerAuth()
@Controller('transcripts')
@UseGuards(RolesGuard)
export class TranscriptController {
  constructor(private readonly transcriptService: TranscriptService) {}

  @Get(':studentId')
  @Roles(
    UserRole.ADMIN,
    UserRole.REGISTRAR,
    UserRole.FACULTY_DEAN,
    UserRole.HOD,
    UserRole.INSTRUCTOR,
    UserRole.STUDENT,
  )
  @ApiOperation({
    summary: 'Generate a full unofficial transcript for a student',
    description:
      'Returns all published grades grouped by semester with semester GPA, cumulative GPA, and graduation eligibility.',
  })
  @ApiParam({ name: 'studentId', description: 'Student profile UUID' })
  @ApiResponse({ status: 200, description: 'Full unofficial transcript' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async generateTranscript(@Param('studentId') studentId: string) {
    return this.transcriptService.generateTranscript(studentId);
  }

  @Get(':studentId/summary')
  @Roles(
    UserRole.ADMIN,
    UserRole.REGISTRAR,
    UserRole.FACULTY_DEAN,
    UserRole.HOD,
    UserRole.INSTRUCTOR,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get quick GPA and credit summary for a student' })
  @ApiParam({ name: 'studentId', description: 'Student profile UUID' })
  @ApiResponse({ status: 200, description: 'Transcript summary with GPA and credit totals' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getTranscriptSummary(@Param('studentId') studentId: string) {
    return this.transcriptService.getTranscriptSummary(studentId);
  }
}
