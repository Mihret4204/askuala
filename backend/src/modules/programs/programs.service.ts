import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { CreateStudentDto } from './dto/create-student.dto';

@Injectable()
export class ProgramsService {
  constructor(private prisma: PrismaService) {}

  // Program Methods
  async createProgram(dto: CreateProgramDto) {
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const existing = await this.prisma.program.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException('Program code already exists');
    }

    return this.prisma.program.create({
      data: {
        departmentId: dto.departmentId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        degreeType: dto.degreeType as any,
        durationYears: dto.durationYears,
        totalCreditsRequired: dto.totalCreditsRequired,
      },
      include: {
        department: true,
      },
    });
  }

  async findAllPrograms() {
    return this.prisma.program.findMany({
      include: {
        department: {
          include: { faculty: true },
        },
      },
    });
  }

  async findOneProgram(id: string) {
    const program = await this.prisma.program.findUnique({
      where: { id },
      include: {
        department: true,
        students: {
          include: { user: true },
        },
      },
    });

    if (!program) {
      throw new NotFoundException(`Program with ID ${id} not found`);
    }

    return program;
  }

  // Student Profile Methods
  async createStudent(dto: CreateStudentDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const program = await this.prisma.program.findUnique({
      where: { id: dto.programId },
    });
    if (!program) {
      throw new NotFoundException('Program not found');
    }

    const existingId = await this.prisma.student.findUnique({
      where: { studentIdNumber: dto.studentIdNumber.toUpperCase() },
    });
    if (existingId) {
      throw new ConflictException('Student ID number already exists');
    }

    return this.prisma.student.create({
      data: {
        userId: dto.userId,
        studentIdNumber: dto.studentIdNumber.toUpperCase(),
        programId: dto.programId,
        batch: dto.batch,
        admissionSemesterId: dto.admissionSemesterId,
      },
      include: {
        user: true,
        program: {
          include: { department: true },
        },
      },
    });
  }

  async findAllStudents() {
    return this.prisma.student.findMany({
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
        },
        program: {
          include: { department: true },
        },
      },
    });
  }

  async findOneStudent(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        user: true,
        program: {
          include: { department: true },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student profile with ID ${id} not found`);
    }

    return student;
  }
}
