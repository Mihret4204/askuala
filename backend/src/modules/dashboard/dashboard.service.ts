import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * System-wide overview for Admin / Registrar.
   */
  async getSystemOverview() {
    const [
      totalStudents,
      activeStudents,
      totalInstructors,
      activeInstructors,
      totalFaculties,
      totalDepartments,
      totalPrograms,
      totalCourses,
      currentSemester,
    ] = await Promise.all([
      this.prisma.student.count(),
      this.prisma.student.count({ where: { status: 'ACTIVE' } }),
      this.prisma.instructor.count(),
      this.prisma.instructor.count({ where: { status: 'ACTIVE' } }),
      this.prisma.faculty.count({ where: { status: 'ACTIVE' } }),
      this.prisma.department.count({ where: { status: 'ACTIVE' } }),
      this.prisma.program.count({ where: { status: 'ACTIVE' } }),
      this.prisma.course.count({ where: { status: 'ACTIVE' } }),
      this.prisma.semester.findFirst({
        where: { isCurrent: true },
        include: { academicYear: true },
      }),
    ]);

    let currentSemesterStats: object | null = null;
    if (currentSemester) {
      const [openOfferings, totalEnrollments, completedOfferings] = await Promise.all([
        this.prisma.courseOffering.count({
          where: { semesterId: currentSemester.id, status: 'OPEN' },
        }),
        this.prisma.enrollment.count({
          where: {
            courseOffering: { semesterId: currentSemester.id },
            status: 'ENROLLED',
          },
        }),
        this.prisma.courseOffering.count({
          where: { semesterId: currentSemester.id, status: 'COMPLETED' },
        }),
      ]);

      currentSemesterStats = {
        id: currentSemester.id,
        code: currentSemester.code,
        name: currentSemester.name,
        academicYear: currentSemester.academicYear.yearCode,
        status: currentSemester.status,
        openOfferings,
        totalEnrollments,
        completedOfferings,
      };
    }

    return {
      institution: {
        totalFaculties,
        totalDepartments,
        totalPrograms,
        totalCourses,
      },
      people: {
        totalStudents,
        activeStudents,
        totalInstructors,
        activeInstructors,
      },
      currentSemester: currentSemesterStats,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Dashboard for a specific student: enrollments, attendance summary, recent grades.
   */
  async getStudentDashboard(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        program: {
          include: { department: { include: { faculty: true } } },
        },
      },
    });

    if (!student) {
      return null;
    }

    const currentSemester = await this.prisma.semester.findFirst({
      where: { isCurrent: true },
    });

    // Current enrollments
    const currentEnrollments = await this.prisma.enrollment.findMany({
      where: {
        studentId,
        status: 'ENROLLED',
        courseOffering: currentSemester
          ? { semesterId: currentSemester.id }
          : undefined,
      },
      include: {
        courseOffering: {
          include: {
            course: true,
            instructor: { include: { user: true } },
            timetableSlots: true,
          },
        },
      },
    });

    // Published grades count
    const publishedGradesCount = await this.prisma.grade.count({
      where: {
        status: 'PUBLISHED',
        enrollment: { studentId },
      },
    });

    // Attendance summary for current semester
    const attendanceStats = await this.prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: {
        enrollment: {
          studentId,
          courseOffering: currentSemester
            ? { semesterId: currentSemester.id }
            : undefined,
        },
      },
      _count: { status: true },
    });

    const attendanceSummary = {
      PRESENT: 0,
      LATE: 0,
      ABSENT: 0,
      EXCUSED: 0,
    } as Record<string, number>;

    for (const stat of attendanceStats) {
      attendanceSummary[stat.status] = stat._count.status;
    }

    const totalRecords = Object.values(attendanceSummary).reduce((a, b) => a + b, 0);
    const attended = attendanceSummary.PRESENT + attendanceSummary.LATE + attendanceSummary.EXCUSED;
    const attendancePercentage =
      totalRecords > 0 ? Math.round((attended / totalRecords) * 10000) / 100 : 100;

    return {
      student: {
        id: student.id,
        studentIdNumber: student.studentIdNumber,
        fullName: `${student.user.firstName} ${student.user.lastName}`,
        email: student.user.email,
        program: student.program.name,
        department: student.program.department.name,
        faculty: student.program.department.faculty.name,
        batch: student.batch,
        status: student.status,
      },
      currentSemester: currentSemester
        ? { id: currentSemester.id, code: currentSemester.code, name: currentSemester.name }
        : null,
      enrollments: currentEnrollments.map((e) => ({
        id: e.id,
        courseCode: e.courseOffering.course.code,
        courseTitle: e.courseOffering.course.title,
        creditHours: e.courseOffering.course.creditHours,
        sectionCode: e.courseOffering.sectionCode,
        instructor: e.courseOffering.instructor
          ? `${e.courseOffering.instructor.user.firstName} ${e.courseOffering.instructor.user.lastName}`
          : null,
        timetableSlotCount: e.courseOffering.timetableSlots.length,
        enrollmentType: e.enrollmentType,
      })),
      attendance: {
        ...attendanceSummary,
        totalRecords,
        attendancePercentage,
      },
      grades: {
        publishedGradesCount,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Dashboard for a specific instructor.
   */
  async getInstructorDashboard(instructorId: string) {
    const instructor = await this.prisma.instructor.findUnique({
      where: { id: instructorId },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        department: true,
      },
    });

    if (!instructor) {
      return null;
    }

    const currentSemester = await this.prisma.semester.findFirst({
      where: { isCurrent: true },
    });

    const currentOfferings = await this.prisma.courseOffering.findMany({
      where: {
        instructorId,
        semesterId: currentSemester?.id,
        status: { in: ['OPEN', 'PLANNED'] },
      },
      include: {
        course: true,
        room: { include: { building: true } },
        _count: { select: { enrollments: true } },
      },
    });

    // Pending grades to submit (enrolled students in instructor's current offerings without a grade)
    const pendingGradeCount = await this.prisma.enrollment.count({
      where: {
        courseOffering: {
          instructorId,
          semesterId: currentSemester?.id,
        },
        status: 'ENROLLED',
        grade: null,
      },
    });

    // Pending excuses to review
    const pendingExcuseCount = await this.prisma.attendanceExcuse.count({
      where: {
        status: 'PENDING',
        attendanceRecord: {
          attendanceSession: {
            instructorId,
          },
        },
      },
    });

    return {
      instructor: {
        id: instructor.id,
        employeeId: instructor.employeeId,
        fullName: `${instructor.user.firstName} ${instructor.user.lastName}`,
        email: instructor.user.email,
        title: instructor.title,
        department: instructor.department.name,
        officeLocation: instructor.officeLocation,
      },
      currentSemester: currentSemester
        ? { id: currentSemester.id, code: currentSemester.code, name: currentSemester.name }
        : null,
      offerings: currentOfferings.map((o) => ({
        id: o.id,
        courseCode: o.course.code,
        courseTitle: o.course.title,
        sectionCode: o.sectionCode,
        status: o.status,
        enrolledCount: o._count.enrollments,
        maxCapacity: o.maxCapacity,
        room: o.room ? `${o.room.building.code}-${o.room.roomNumber}` : null,
      })),
      actions: {
        pendingGradesToSubmit: pendingGradeCount,
        pendingExcusesToReview: pendingExcuseCount,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
