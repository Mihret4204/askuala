import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { SubmitAttendanceDto } from './dto/submit-attendance.dto';
import { SubmitExcuseDto } from './dto/submit-excuse.dto';
import { ReviewExcuseDto } from './dto/review-excuse.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // 1. Create a session
  async createSession(dto: CreateAttendanceSessionDto) {
    const courseOffering = await this.prisma.courseOffering.findUnique({
      where: { id: dto.courseOfferingId },
    });
    if (!courseOffering) {
      throw new NotFoundException(`Course offering with ID ${dto.courseOfferingId} not found`);
    }

    if (dto.timetableSlotId) {
      const timetableSlot = await this.prisma.timetableSlot.findUnique({
        where: { id: dto.timetableSlotId },
      });
      if (!timetableSlot || timetableSlot.courseOfferingId !== dto.courseOfferingId) {
        throw new BadRequestException('Timetable slot is invalid or does not belong to this course offering');
      }
    }

    if (dto.instructorId) {
      const instructor = await this.prisma.instructor.findUnique({
        where: { id: dto.instructorId },
      });
      if (!instructor) {
        throw new NotFoundException(`Instructor with ID ${dto.instructorId} not found`);
      }
    }

    if (dto.roomId) {
      const room = await this.prisma.room.findUnique({
        where: { id: dto.roomId },
      });
      if (!room) {
        throw new NotFoundException(`Room with ID ${dto.roomId} not found`);
      }
    }

    const sessionDate = new Date(dto.sessionDate);

    // Check duplicate
    const existing = await this.prisma.attendanceSession.findUnique({
      where: {
        courseOfferingId_sessionDate_startTime: {
          courseOfferingId: dto.courseOfferingId,
          sessionDate,
          startTime: dto.startTime,
        },
      },
    });

    if (existing) {
      throw new ConflictException('An attendance session already exists for this course offering, date, and start time');
    }

    return this.prisma.attendanceSession.create({
      data: {
        courseOfferingId: dto.courseOfferingId,
        timetableSlotId: dto.timetableSlotId,
        instructorId: dto.instructorId || courseOffering.instructorId,
        roomId: dto.roomId || courseOffering.roomId,
        sessionDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        topicTitle: dto.topicTitle,
        sessionType: dto.sessionType as any ?? 'REGULAR',
        status: 'SCHEDULED',
      },
      include: {
        courseOffering: { include: { course: true } },
        room: true,
      },
    });
  }

  // 2. Submit Roll Call
  async submitAttendance(sessionId: string, dto: SubmitAttendanceDto, userId: string) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Attendance session with ID ${sessionId} not found`);
    }

    if (session.status === 'LOCKED') {
      throw new BadRequestException('Cannot modify attendance for a locked session');
    }

    // Get all valid enrollments for this course offering to validate input
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        courseOfferingId: session.courseOfferingId,
        status: 'ENROLLED',
      },
    });

    const validEnrollmentIds = new Set(enrollments.map((e) => e.id));

    // Validate that all submitted record IDs are valid enrollments for this offering
    for (const record of dto.records) {
      if (!validEnrollmentIds.has(record.enrollmentId)) {
        throw new BadRequestException(`Enrollment ID ${record.enrollmentId} is not active in this course offering`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Upsert attendance records
      for (const record of dto.records) {
        const minutesLate = record.status === 'LATE' ? (record.minutesLate ?? 0) : 0;
        await tx.attendanceRecord.upsert({
          where: {
            attendanceSessionId_enrollmentId: {
              attendanceSessionId: sessionId,
              enrollmentId: record.enrollmentId,
            },
          },
          update: {
            status: record.status as any,
            minutesLate,
            remarks: record.remarks,
          },
          create: {
            attendanceSessionId: sessionId,
            enrollmentId: record.enrollmentId,
            status: record.status as any,
            minutesLate,
            remarks: record.remarks,
          },
        });
      }

      // Update session status to SUBMITTED
      return tx.attendanceSession.update({
        where: { id: sessionId },
        data: {
          status: 'SUBMITTED',
          takenByUserId: userId,
          submittedAt: new Date(),
        },
        include: {
          attendanceRecords: true,
        },
      });
    });
  }

  // 3. Submit excuse (Absence Request)
  async submitExcuse(recordId: string, dto: SubmitExcuseDto) {
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { id: recordId },
      include: { excuse: true },
    });

    if (!record) {
      throw new NotFoundException(`Attendance record with ID ${recordId} not found`);
    }

    if (record.status !== 'ABSENT') {
      throw new BadRequestException('Excuses can only be submitted for ABSENT records');
    }

    if (record.excuse) {
      throw new ConflictException('An excuse has already been submitted for this attendance record');
    }

    return this.prisma.attendanceExcuse.create({
      data: {
        attendanceRecordId: recordId,
        reason: dto.reason as any,
        description: dto.description,
        documentUrl: dto.documentUrl,
        status: 'PENDING',
      },
    });
  }

  // 4. Review excuse
  async reviewExcuse(excuseId: string, dto: ReviewExcuseDto, userId: string) {
    const excuse = await this.prisma.attendanceExcuse.findUnique({
      where: { id: excuseId },
      include: { attendanceRecord: true },
    });

    if (!excuse) {
      throw new NotFoundException(`Attendance excuse with ID ${excuseId} not found`);
    }

    if (excuse.status !== 'PENDING') {
      throw new BadRequestException('Excuse has already been reviewed');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedExcuse = await tx.attendanceExcuse.update({
        where: { id: excuseId },
        data: {
          status: dto.status as any,
          reviewedByUserId: userId,
          reviewedAt: new Date(),
        },
      });

      if (dto.status === 'APPROVED') {
        // Update attendance record status to EXCUSED
        await tx.attendanceRecord.update({
          where: { id: excuse.attendanceRecordId },
          data: { status: 'EXCUSED' },
        });
      }

      return updatedExcuse;
    });
  }

  // Queries
  async getSessionsForOffering(offeringId: string) {
    return this.prisma.attendanceSession.findMany({
      where: { courseOfferingId: offeringId },
      include: {
        room: true,
        instructor: { include: { user: true } },
      },
      orderBy: { sessionDate: 'desc' },
    });
  }

  async getSessionWithRecords(id: string) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id },
      include: {
        room: true,
        instructor: { include: { user: true } },
        attendanceRecords: {
          include: {
            enrollment: {
              include: {
                student: { include: { user: true } },
              },
            },
            excuse: true,
          },
        },
      },
    });
    if (!session) {
      throw new NotFoundException(`Attendance session with ID ${id} not found`);
    }
    return session;
  }

  async getStudentSummary(studentId: string, semesterId?: string) {
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        enrollment: {
          studentId,
          courseOffering: semesterId ? { semesterId } : undefined,
        },
      },
      include: {
        attendanceSession: {
          include: {
            courseOffering: { include: { course: true } },
          },
        },
      },
    });

    const total = records.length;
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const excused = records.filter((r) => r.status === 'EXCUSED').length;

    // Attendance percentage calculation: (Present + Late + Excused) / Total
    const attendedCount = present + late + excused;
    const attendancePercentage = total > 0 ? (attendedCount / total) * 100 : 100;

    return {
      studentId,
      totalSessions: total,
      present,
      late,
      absent,
      excused,
      attendancePercentage: Math.round(attendancePercentage * 100) / 100,
      records: records.map((r) => ({
        id: r.id,
        sessionDate: r.attendanceSession.sessionDate,
        courseCode: r.attendanceSession.courseOffering.course.code,
        courseTitle: r.attendanceSession.courseOffering.course.title,
        status: r.status,
        minutesLate: r.minutesLate,
        remarks: r.remarks,
      })),
    };
  }

  async getPendingExcuses() {
    return this.prisma.attendanceExcuse.findMany({
      where: { status: 'PENDING' },
      include: {
        attendanceRecord: {
          include: {
            attendanceSession: {
              include: {
                courseOffering: { include: { course: true } },
              },
            },
            enrollment: {
              include: {
                student: { include: { user: true } },
              },
            },
          },
        },
      },
    });
  }
}
