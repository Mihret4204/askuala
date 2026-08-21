import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SubmitGradeDto } from './dto/submit-grade.dto';
import { ApproveGradeDto, GradeApprovalAction } from './dto/approve-grade.dto';

// Mapping from letter grade to grade points (Ethiopian/standard 4.0 scale)
const GRADE_POINTS_MAP: Record<string, number> = {
  'A+': 4.0,
  'A':  4.0,
  'A-': 3.67,
  'B+': 3.33,
  'B':  3.0,
  'B-': 2.67,
  'C+': 2.33,
  'C':  2.0,
  'D':  1.0,
  'F':  0.0,
  'I':  0.0,  // Incomplete
  'W':  0.0,  // Withdrawn
};

const PASSING_GRADES = new Set(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D']);

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Submit / Record a Grade (Instructor)
  // ---------------------------------------------------------------------------
  async submitGrade(dto: SubmitGradeDto, instructorId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: dto.enrollmentId },
      include: {
        courseOffering: {
          include: { course: true },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${dto.enrollmentId} not found`);
    }

    if (enrollment.status !== 'ENROLLED' && enrollment.status !== 'COMPLETED') {
      throw new BadRequestException(
        `Cannot submit grade for enrollment with status ${enrollment.status}`,
      );
    }

    const existing = await this.prisma.grade.findUnique({
      where: { enrollmentId: dto.enrollmentId },
    });

    if (existing && existing.status === 'PUBLISHED') {
      throw new ForbiddenException('Cannot modify a published grade');
    }

    const isPassing = PASSING_GRADES.has(dto.letterGrade);
    const gradePoints = dto.gradePoints ?? GRADE_POINTS_MAP[dto.letterGrade] ?? 0;

    if (existing) {
      // Update existing DRAFT/SUBMITTED grade
      if (existing.status === 'APPROVED') {
        throw new ForbiddenException('Cannot modify an approved grade without rejecting it first');
      }

      return this.prisma.grade.update({
        where: { enrollmentId: dto.enrollmentId },
        data: {
          letterGrade: dto.letterGrade,
          gradePoints,
          percentageScore: dto.percentageScore,
          isPassing,
          status: 'SUBMITTED',
          gradedById: instructorId,
          remarks: dto.remarks,
        },
        include: {
          enrollment: {
            include: {
              student: { include: { user: true } },
              courseOffering: { include: { course: true } },
            },
          },
        },
      });
    }

    // Create new grade entry
    return this.prisma.grade.create({
      data: {
        enrollmentId: dto.enrollmentId,
        letterGrade: dto.letterGrade,
        gradePoints,
        percentageScore: dto.percentageScore,
        isPassing,
        status: 'SUBMITTED',
        gradedById: instructorId,
        remarks: dto.remarks,
      },
      include: {
        enrollment: {
          include: {
            student: { include: { user: true } },
            courseOffering: { include: { course: true } },
          },
        },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Approve / Reject Grade (Registrar / Admin)
  // ---------------------------------------------------------------------------
  async approveGrade(gradeId: string, dto: ApproveGradeDto, userId: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id: gradeId },
    });

    if (!grade) {
      throw new NotFoundException(`Grade with ID ${gradeId} not found`);
    }

    if (grade.status !== 'SUBMITTED') {
      throw new BadRequestException(
        `Only grades in SUBMITTED status can be approved. Current status: ${grade.status}`,
      );
    }

    const newStatus =
      dto.action === GradeApprovalAction.APPROVE ? 'APPROVED' : 'DRAFT';

    return this.prisma.grade.update({
      where: { id: gradeId },
      data: {
        status: newStatus,
        approvedById: dto.action === GradeApprovalAction.APPROVE ? userId : null,
        approvedAt: dto.action === GradeApprovalAction.APPROVE ? new Date() : null,
      },
      include: {
        enrollment: {
          include: {
            student: { include: { user: true } },
            courseOffering: { include: { course: true } },
          },
        },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Publish Grade (Registrar / Admin) — makes it visible to students
  // ---------------------------------------------------------------------------
  async publishGrade(gradeId: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id: gradeId },
    });

    if (!grade) {
      throw new NotFoundException(`Grade with ID ${gradeId} not found`);
    }

    if (grade.status !== 'APPROVED') {
      throw new BadRequestException(
        `Only grades in APPROVED status can be published. Current status: ${grade.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.grade.update({
        where: { id: gradeId },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
        include: {
          enrollment: {
            include: {
              student: { include: { user: true } },
              courseOffering: { include: { course: true } },
            },
          },
        },
      });

      // Sync enrollment status based on final published grade
      const enrollmentStatus = updated.isPassing ? 'COMPLETED' : 'FAILED';
      await tx.enrollment.update({
        where: { id: updated.enrollmentId },
        data: {
          status: enrollmentStatus,
          completedAt: new Date(),
        },
      });

      return updated;
    });
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async findGradeByEnrollment(enrollmentId: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { enrollmentId },
      include: {
        enrollment: {
          include: {
            student: { include: { user: true } },
            courseOffering: { include: { course: true, semester: true } },
          },
        },
        gradedBy: { include: { user: true } },
        approvedBy: true,
      },
    });

    if (!grade) {
      throw new NotFoundException(`No grade found for enrollment ${enrollmentId}`);
    }

    return grade;
  }

  async findGradeById(id: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id },
      include: {
        enrollment: {
          include: {
            student: { include: { user: true } },
            courseOffering: { include: { course: true, semester: true } },
          },
        },
        gradedBy: { include: { user: true } },
        approvedBy: true,
      },
    });

    if (!grade) {
      throw new NotFoundException(`Grade with ID ${id} not found`);
    }

    return grade;
  }

  async findGradesByOffering(courseOfferingId: string) {
    return this.prisma.grade.findMany({
      where: {
        enrollment: { courseOfferingId },
      },
      include: {
        enrollment: {
          include: {
            student: { include: { user: true } },
            courseOffering: { include: { course: true } },
          },
        },
        gradedBy: { include: { user: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findGradesByStudent(studentId: string, semesterId?: string) {
    return this.prisma.grade.findMany({
      where: {
        enrollment: {
          studentId,
          courseOffering: semesterId ? { semesterId } : undefined,
          status: { in: ['COMPLETED', 'FAILED', 'ENROLLED'] },
        },
        status: 'PUBLISHED',
      },
      include: {
        enrollment: {
          include: {
            courseOffering: {
              include: { course: true, semester: true },
            },
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // GPA Calculation
  // ---------------------------------------------------------------------------
  async calculateGpa(studentId: string, semesterId?: string) {
    const grades = await this.prisma.grade.findMany({
      where: {
        enrollment: {
          studentId,
          courseOffering: semesterId ? { semesterId } : undefined,
          status: { in: ['COMPLETED', 'FAILED'] },
        },
        status: 'PUBLISHED',
      },
      include: {
        enrollment: {
          include: {
            courseOffering: {
              include: { course: true },
            },
          },
        },
      },
    });

    if (grades.length === 0) {
      return {
        studentId,
        semesterId: semesterId ?? null,
        gpa: 0,
        totalCreditAttempted: 0,
        totalCreditEarned: 0,
        gradeCount: 0,
      };
    }

    let totalQualityPoints = 0;
    let totalCreditAttempted = 0;
    let totalCreditEarned = 0;

    for (const grade of grades) {
      const creditHours = Number(grade.enrollment.courseOffering.course.creditHours);
      const gp = Number(grade.gradePoints);

      totalCreditAttempted += creditHours;
      totalQualityPoints += gp * creditHours;

      if (grade.isPassing) {
        totalCreditEarned += creditHours;
      }
    }

    const gpa =
      totalCreditAttempted > 0
        ? Math.round((totalQualityPoints / totalCreditAttempted) * 100) / 100
        : 0;

    return {
      studentId,
      semesterId: semesterId ?? null,
      gpa,
      totalCreditAttempted,
      totalCreditEarned,
      gradeCount: grades.length,
    };
  }

  async findPendingGrades() {
    return this.prisma.grade.findMany({
      where: { status: 'SUBMITTED' },
      include: {
        enrollment: {
          include: {
            student: { include: { user: true } },
            courseOffering: { include: { course: true, semester: true } },
          },
        },
        gradedBy: { include: { user: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
