import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCourseOfferingDto } from './dto/create-course-offering.dto';

@Injectable()
export class CourseOfferingsService {
  constructor(private prisma: PrismaService) {}

  async createCourseOffering(dto: CreateCourseOfferingDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const semester = await this.prisma.semester.findUnique({
      where: { id: dto.semesterId },
    });
    if (!semester) {
      throw new NotFoundException('Semester not found');
    }

    if (dto.instructorId) {
      const instructor = await this.prisma.instructor.findUnique({
        where: { id: dto.instructorId },
      });
      if (!instructor) {
        throw new NotFoundException('Instructor not found');
      }
    }

    if (dto.roomId) {
      const room = await this.prisma.room.findUnique({
        where: { id: dto.roomId },
      });
      if (!room) {
        throw new NotFoundException('Room not found');
      }
    }

    const deliveryMode = dto.deliveryMode as any ?? 'REGULAR';
    const sectionCode = dto.sectionCode.toUpperCase();

    const existing = await this.prisma.courseOffering.findUnique({
      where: {
        courseId_semesterId_sectionCode_deliveryMode: {
          courseId: dto.courseId,
          semesterId: dto.semesterId,
          sectionCode,
          deliveryMode,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Course offering for section ${sectionCode} (${deliveryMode}) already exists in this semester`,
      );
    }

    return this.prisma.courseOffering.create({
      data: {
        courseId: dto.courseId,
        semesterId: dto.semesterId,
        instructorId: dto.instructorId,
        roomId: dto.roomId,
        sectionCode,
        deliveryMode,
        maxCapacity: dto.maxCapacity,
        status: dto.status as any ?? 'PLANNED',
        syllabusUrl: dto.syllabusUrl,
      },
      include: {
        course: true,
        semester: true,
        instructor: { include: { user: true } },
        room: { include: { building: true } },
      },
    });
  }

  async findAllCourseOfferings() {
    return this.prisma.courseOffering.findMany({
      include: {
        course: true,
        semester: true,
        instructor: { include: { user: true } },
        room: true,
      },
    });
  }

  async findOneCourseOffering(id: string) {
    const offering = await this.prisma.courseOffering.findUnique({
      where: { id },
      include: {
        course: {
          include: {
            prerequisiteRequirements: { include: { prerequisiteCourse: true } },
          },
        },
        semester: true,
        instructor: { include: { user: true } },
        room: { include: { building: true } },
      },
    });

    if (!offering) {
      throw new NotFoundException(`Course Offering with ID ${id} not found`);
    }

    return offering;
  }
}
