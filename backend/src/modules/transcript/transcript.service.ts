import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TranscriptService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate a full unofficial transcript for a student.
   * Groups published grades by semester, computes semester GPA and cumulative GPA.
   */
  async generateTranscript(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        program: {
          include: {
            department: {
              include: { faculty: true },
            },
          },
        },
        admissionSemester: {
          include: { academicYear: true },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    // Fetch all published grades with their related data
    const grades = await this.prisma.grade.findMany({
      where: {
        status: 'PUBLISHED',
        enrollment: {
          studentId,
          status: { in: ['COMPLETED', 'FAILED'] },
        },
      },
      include: {
        enrollment: {
          include: {
            courseOffering: {
              include: {
                course: true,
                semester: {
                  include: { academicYear: true },
                },
              },
            },
          },
        },
      },
      orderBy: [
        {
          enrollment: {
            courseOffering: {
              semester: { startDate: 'asc' },
            },
          },
        },
      ],
    });

    // Group by semester
    const semesterMap = new Map<
      string,
      {
        semester: any;
        academicYear: any;
        entries: any[];
        semesterCreditsAttempted: number;
        semesterCreditsEarned: number;
        semesterQualityPoints: number;
      }
    >();

    for (const grade of grades) {
      const offering = grade.enrollment.courseOffering;
      const semester = offering.semester;
      const semKey = semester.id;

      if (!semesterMap.has(semKey)) {
        semesterMap.set(semKey, {
          semester,
          academicYear: semester.academicYear,
          entries: [],
          semesterCreditsAttempted: 0,
          semesterCreditsEarned: 0,
          semesterQualityPoints: 0,
        });
      }

      const entry = semesterMap.get(semKey)!;
      const creditHours = Number(offering.course.creditHours);
      const gradePoints = Number(grade.gradePoints);

      entry.entries.push({
        courseCode: offering.course.code,
        courseTitle: offering.course.title,
        creditHours,
        letterGrade: grade.letterGrade,
        gradePoints,
        isPassing: grade.isPassing,
        percentageScore: grade.percentageScore ? Number(grade.percentageScore) : null,
      });

      entry.semesterCreditsAttempted += creditHours;
      entry.semesterQualityPoints += gradePoints * creditHours;
      if (grade.isPassing) {
        entry.semesterCreditsEarned += creditHours;
      }
    }

    // Build semesters array with semester GPA
    const semesters = Array.from(semesterMap.values()).map((s) => {
      const semesterGpa =
        s.semesterCreditsAttempted > 0
          ? Math.round((s.semesterQualityPoints / s.semesterCreditsAttempted) * 100) / 100
          : 0;

      return {
        semesterCode: s.semester.code,
        semesterName: s.semester.name,
        academicYear: s.academicYear.yearCode,
        termType: s.semester.termType,
        courses: s.entries,
        semesterCreditsAttempted: s.semesterCreditsAttempted,
        semesterCreditsEarned: s.semesterCreditsEarned,
        semesterGpa,
      };
    });

    // Cumulative totals
    let totalCreditsAttempted = 0;
    let totalCreditsEarned = 0;
    let totalQualityPoints = 0;

    for (const s of semesterMap.values()) {
      totalCreditsAttempted += s.semesterCreditsAttempted;
      totalCreditsEarned += s.semesterCreditsEarned;
      totalQualityPoints += s.semesterQualityPoints;
    }

    const cumulativeGpa =
      totalCreditsAttempted > 0
        ? Math.round((totalQualityPoints / totalCreditsAttempted) * 100) / 100
        : 0;

    return {
      student: {
        id: student.id,
        studentIdNumber: student.studentIdNumber,
        fullName: `${student.user.firstName} ${student.user.lastName}`,
        email: student.user.email,
        batch: student.batch,
        status: student.status,
      },
      program: {
        code: student.program.code,
        name: student.program.name,
        degreeType: student.program.degreeType,
        department: student.program.department.name,
        faculty: student.program.department.faculty.name,
      },
      admissionSemester: student.admissionSemester
        ? {
            code: student.admissionSemester.code,
            name: student.admissionSemester.name,
            academicYear: student.admissionSemester.academicYear.yearCode,
          }
        : null,
      semesters,
      summary: {
        totalCreditsAttempted,
        totalCreditsEarned,
        totalCreditsRequired: student.program.totalCreditsRequired,
        cumulativeGpa,
        gradeCount: grades.length,
        isEligibleForGraduation:
          totalCreditsEarned >= student.program.totalCreditsRequired &&
          cumulativeGpa >= 2.0,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get a quick GPA-only summary (no full course listing).
   */
  async getTranscriptSummary(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        program: true,
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    const grades = await this.prisma.grade.findMany({
      where: {
        status: 'PUBLISHED',
        enrollment: {
          studentId,
          status: { in: ['COMPLETED', 'FAILED'] },
        },
      },
      include: {
        enrollment: {
          include: {
            courseOffering: { include: { course: true } },
          },
        },
      },
    });

    let totalCreditsAttempted = 0;
    let totalCreditsEarned = 0;
    let totalQualityPoints = 0;

    for (const grade of grades) {
      const creditHours = Number(grade.enrollment.courseOffering.course.creditHours);
      const gradePoints = Number(grade.gradePoints);
      totalCreditsAttempted += creditHours;
      totalQualityPoints += gradePoints * creditHours;
      if (grade.isPassing) totalCreditsEarned += creditHours;
    }

    const cumulativeGpa =
      totalCreditsAttempted > 0
        ? Math.round((totalQualityPoints / totalCreditsAttempted) * 100) / 100
        : 0;

    return {
      studentId: student.id,
      studentIdNumber: student.studentIdNumber,
      fullName: `${student.user.firstName} ${student.user.lastName}`,
      programCode: student.program.code,
      programName: student.program.name,
      degreeType: student.program.degreeType,
      totalCreditsAttempted,
      totalCreditsEarned,
      totalCreditsRequired: student.program.totalCreditsRequired,
      cumulativeGpa,
      isEligibleForGraduation:
        totalCreditsEarned >= student.program.totalCreditsRequired && cumulativeGpa >= 2.0,
    };
  }
}
