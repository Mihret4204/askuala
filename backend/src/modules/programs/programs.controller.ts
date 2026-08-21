import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProgramsService } from './programs.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Programs & Students')
@ApiBearerAuth()
@Controller('programs')
@UseGuards(RolesGuard)
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  // Student endpoints are declared BEFORE :id to prevent route shadowing
  @Post('students')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR)
  async createStudent(@Body() dto: CreateStudentDto) {
    return this.programsService.createStudent(dto);
  }

  @Get('students')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR, UserRole.FACULTY_DEAN, UserRole.HOD, UserRole.INSTRUCTOR)
  async findAllStudents() {
    return this.programsService.findAllStudents();
  }

  @Get('students/:id')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR, UserRole.FACULTY_DEAN, UserRole.HOD, UserRole.INSTRUCTOR, UserRole.STUDENT)
  async findOneStudent(@Param('id') id: string) {
    return this.programsService.findOneStudent(id);
  }

  // Program endpoints
  @Post()
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR, UserRole.HOD)
  async createProgram(@Body() dto: CreateProgramDto) {
    return this.programsService.createProgram(dto);
  }

  @Get()
  async findAllPrograms() {
    return this.programsService.findAllPrograms();
  }

  @Get(':id')
  async findOneProgram(@Param('id') id: string) {
    return this.programsService.findOneProgram(id);
  }
}
