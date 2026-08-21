import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentStatusDto } from './dto/update-enrollment-status.dto';

@Injectable()
export class EnrollmentService {
  constructor(private prisma: PrismaService) {}

  async createEnrollment(dto: CreateEnrollmentDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const offering = await this.prisma.courseOffering.findUnique({
      where: { id: dto.courseOfferingId },
      include: { course: true },
    });
    if (!offering) {
      throw new NotFoundException('Course offering not found');
    }

    if (offering.status === 'CANCELLED' || offering.status === 'COMPLETED') {
      throw new BadRequestException(`Cannot enroll in course offering with status ${offering.status}`);
    }

    if (offering.currentEnrollment >= offering.maxCapacity) {
      throw new ConflictException('Course offering section has reached maximum enrollment capacity');
    }

    // Check duplicate active enrollment in exact same section
    const activeSectionEnrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId: dto.studentId,
        courseOfferingId: dto.courseOfferingId,
        status: 'ENROLLED',
      },
    });

    if (activeSectionEnrollment) {
      throw new ConflictException('Student is already actively enrolled in this course section');
    }

    // Calculate attempt number for this catalog course
    const previousAttempts = await this.prisma.enrollment.count({
      where: {
        studentId: dto.studentId,
        courseOffering: {
          courseId: offering.courseId,
        },
      },
    });

    const attemptNumber = previousAttempts + 1;

    return this.prisma.$transaction(async (tx) => {
      // Increment section currentEnrollment count
      await tx.courseOffering.update({
        where: { id: offering.id },
        data: { currentEnrollment: { increment: 1 } },
      });

      return tx.enrollment.create({
        data: {
          studentId: dto.studentId,
          courseOfferingId: dto.courseOfferingId,
          enrollmentType: dto.enrollmentType as any ?? 'CREDIT',
          status: 'ENROLLED',
          attemptNumber,
          enrolledAt: new Date(),
        },
        include: {
          student: { include: { user: true } },
          courseOffering: { include: { course: true, semester: true } },
        },
      });
    });
  }

  async findAllEnrollments() {
    return this.prisma.enrollment.findMany({
      include: {
        student: { include: { user: true } },
        courseOffering: { include: { course: true, semester: true } },
      },
    });
  }

  async findOneEnrollment(id: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        student: { include: { user: true, program: true } },
        courseOffering: {
          include: {
            course: true,
            semester: true,
            instructor: { include: { user: true } },
            room: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }

    return enrollment;
  }

  async updateEnrollmentStatus(id: string, dto: UpdateEnrollmentStatusDto) {
    const enrollment = await this.findOneEnrollment(id);

    const now = new Date();
    let droppedAt: Date | null = enrollment.droppedAt;
    let withdrawnAt: Date | null = enrollment.withdrawnAt;
    let completedAt: Date | null = enrollment.completedAt;

    if (dto.status === 'DROPPED') {
      droppedAt = now;
    } else if (dto.status === 'WITHDRAWN') {
      withdrawnAt = now;
    } else if (dto.status === 'COMPLETED' || dto.status === 'FAILED') {
      completedAt = now;
    }

    return this.prisma.$transaction(async (tx) => {
      // If changing from ENROLLED to DROPPED/WITHDRAWN, decrement currentEnrollment count
      if (
        enrollment.status === 'ENROLLED' &&
        (dto.status === 'DROPPED' || dto.status === 'WITHDRAWN')
      ) {
        await tx.courseOffering.update({
          where: { id: enrollment.courseOfferingId },
          data: { currentEnrollment: { decrement: 1 } },
        });
      }

      return tx.enrollment.update({
        where: { id },
        data: {
          status: dto.status as any,
          droppedAt,
          withdrawnAt,
          completedAt,
        },
        include: {
          student: { include: { user: true } },
          courseOffering: { include: { course: true, semester: true } },
        },
      });
    });
  }
}
