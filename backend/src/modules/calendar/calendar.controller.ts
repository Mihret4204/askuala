import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Academic Calendar')
@ApiBearerAuth()
@Controller('academic-calendar')
@UseGuards(RolesGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  // Academic Year Endpoints
  @Post('years')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR)
  async createAcademicYear(@Body() dto: CreateAcademicYearDto) {
    return this.calendarService.createAcademicYear(dto);
  }

  @Public()
  @Get('years')
  async findAllAcademicYears() {
    return this.calendarService.findAllAcademicYears();
  }

  @Public()
  @Get('years/:id')
  async findOneAcademicYear(@Param('id') id: string) {
    return this.calendarService.findOneAcademicYear(id);
  }

  @Patch('years/:id/activate')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR)
  async setNextActiveAcademicYear(@Param('id') id: string) {
    return this.calendarService.setNextActiveAcademicYear(id);
  }

  // Semester Endpoints
  @Post('semesters')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR)
  async createSemester(@Body() dto: CreateSemesterDto) {
    return this.calendarService.createSemester(dto);
  }

  @Public()
  @Get('semesters')
  async findAllSemesters() {
    return this.calendarService.findAllSemesters();
  }

  @Public()
  @Get('semesters/:id')
  async findOneSemester(@Param('id') id: string) {
    return this.calendarService.findOneSemester(id);
  }

  @Patch('semesters/:id/activate')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR)
  async setNextActiveSemester(@Param('id') id: string) {
    return this.calendarService.setNextActiveSemester(id);
  }
}
