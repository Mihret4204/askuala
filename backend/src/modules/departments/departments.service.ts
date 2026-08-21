import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateInstructorDto } from './dto/create-instructor.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  // Faculty Methods
  async createFaculty(dto: CreateFacultyDto) {
    const existing = await this.prisma.faculty.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException('Faculty code already exists');
    }

    return this.prisma.faculty.create({
      data: {
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        establishedYear: dto.establishedYear,
      },
    });
  }

  async findAllFaculties() {
    return this.prisma.faculty.findMany({
      include: {
        departments: true,
      },
    });
  }

  // Department Methods
  async createDepartment(dto: CreateDepartmentDto) {
    const faculty = await this.prisma.faculty.findUnique({
      where: { id: dto.facultyId },
    });
    if (!faculty) {
      throw new NotFoundException('Faculty not found');
    }

    const existing = await this.prisma.department.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException('Department code already exists');
    }

    return this.prisma.department.create({
      data: {
        facultyId: dto.facultyId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        headInstructorId: dto.headInstructorId,
      },
      include: {
        faculty: true,
        headInstructor: {
          include: { user: true },
        },
      },
    });
  }

  async findAllDepartments() {
    return this.prisma.department.findMany({
      include: {
        faculty: true,
        headInstructor: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        programs: true,
      },
    });
  }

  async findOneDepartment(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        faculty: true,
        headInstructor: {
          include: { user: true },
        },
        instructors: {
          include: { user: true },
        },
        programs: true,
      },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return department;
  }

  // Instructor Methods
  async createInstructor(dto: CreateInstructorDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const existingEmp = await this.prisma.instructor.findUnique({
      where: { employeeId: dto.employeeId },
    });
    if (existingEmp) {
      throw new ConflictException('Employee ID already registered');
    }

    return this.prisma.instructor.create({
      data: {
        userId: dto.userId,
        employeeId: dto.employeeId,
        departmentId: dto.departmentId,
        title: dto.title,
        officeLocation: dto.officeLocation,
      },
      include: {
        user: true,
        department: true,
      },
    });
  }

  async findAllInstructors() {
    return this.prisma.instructor.findMany({
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
        department: true,
      },
    });
  }
}
