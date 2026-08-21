import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Academic Structure')
@ApiBearerAuth()
@Controller('academic-structure')
@UseGuards(RolesGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  // Faculty Endpoints
  @Post('faculties')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR)
  async createFaculty(@Body() dto: CreateFacultyDto) {
    return this.departmentsService.createFaculty(dto);
  }

  @Get('faculties')
  async findAllFaculties() {
    return this.departmentsService.findAllFaculties();
  }

  // Department Endpoints
  @Post('departments')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR, UserRole.FACULTY_DEAN)
  async createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.createDepartment(dto);
  }

  @Get('departments')
  async findAllDepartments() {
    return this.departmentsService.findAllDepartments();
  }

  @Get('departments/:id')
  async findOneDepartment(@Param('id') id: string) {
    return this.departmentsService.findOneDepartment(id);
  }

  // Instructor Endpoints
  @Post('instructors')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR, UserRole.HOD)
  async createInstructor(@Body() dto: CreateInstructorDto) {
    return this.departmentsService.createInstructor(dto);
  }

  @Get('instructors')
  async findAllInstructors() {
    return this.departmentsService.findAllInstructors();
  }
}
