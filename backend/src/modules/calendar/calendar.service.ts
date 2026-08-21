import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { CreateSemesterDto } from './dto/create-semester.dto';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  // Academic Year Methods
  async createAcademicYear(dto: CreateAcademicYearDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const existing = await this.prisma.academicYear.findUnique({
      where: { yearCode: dto.yearCode },
    });
    if (existing) {
      throw new ConflictException(`Academic Year code ${dto.yearCode} already exists`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isCurrent) {
        // Deactivate any currently active academic year
        await tx.academicYear.updateMany({
          where: { isCurrent: true },
          data: { isCurrent: false },
        });
      }

      return tx.academicYear.create({
        data: {
          yearCode: dto.yearCode,
          title: dto.title,
          startDate,
          endDate,
          isCurrent: dto.isCurrent ?? false,
          status: dto.status as any ?? 'PLANNED',
        },
      });
    });
  }

  async findAllAcademicYears() {
    return this.prisma.academicYear.findMany({
      include: {
        semesters: true,
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOneAcademicYear(id: string) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id },
      include: {
        semesters: true,
      },
    });
    if (!year) {
      throw new NotFoundException(`Academic Year with ID ${id} not found`);
    }
    return year;
  }

  async setNextActiveAcademicYear(id: string) {
    const year = await this.findOneAcademicYear(id);

    return this.prisma.$transaction(async (tx) => {
      await tx.academicYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });

      return tx.academicYear.update({
        where: { id: year.id },
        data: { isCurrent: true, status: 'ACTIVE' },
      });
    });
  }

  // Semester Methods
  async createSemester(dto: CreateSemesterDto) {
    const academicYear = await this.findOneAcademicYear(dto.academicYearId);

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('Semester end date must be after start date');
    }

    if (startDate < academicYear.startDate || endDate > academicYear.endDate) {
      throw new BadRequestException('Semester dates must fall within parent Academic Year date range');
    }

    const existingCode = await this.prisma.semester.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existingCode) {
      throw new ConflictException(`Semester code ${dto.code} already exists`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isCurrent) {
        await tx.semester.updateMany({
          where: { isCurrent: true },
          data: { isCurrent: false },
        });
      }

      return tx.semester.create({
        data: {
          academicYearId: dto.academicYearId,
          code: dto.code.toUpperCase(),
          name: dto.name,
          termType: dto.termType as any,
          startDate,
          endDate,
          registrationStartDate: dto.registrationStartDate ? new Date(dto.registrationStartDate) : null,
          registrationEndDate: dto.registrationEndDate ? new Date(dto.registrationEndDate) : null,
          isCurrent: dto.isCurrent ?? false,
          status: dto.status as any ?? 'PLANNED',
        },
        include: {
          academicYear: true,
        },
      });
    });
  }

  async findAllSemesters() {
    return this.prisma.semester.findMany({
      include: {
        academicYear: true,
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOneSemester(id: string) {
    const semester = await this.prisma.semester.findUnique({
      where: { id },
      include: {
        academicYear: true,
      },
    });
    if (!semester) {
      throw new NotFoundException(`Semester with ID ${id} not found`);
    }
    return semester;
  }

  async setNextActiveSemester(id: string) {
    const semester = await this.findOneSemester(id);

    return this.prisma.$transaction(async (tx) => {
      await tx.semester.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });

      return tx.semester.update({
        where: { id: semester.id },
        data: { isCurrent: true, status: 'ACTIVE' },
      });
    });
  }
}
