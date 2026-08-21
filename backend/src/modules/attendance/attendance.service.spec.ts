import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../../database/prisma.service';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: PrismaService;

  const mockTx = {
    attendanceRecord: {
      upsert: jest.fn(),
    },
    attendanceSession: {
      update: jest.fn(),
    },
    attendanceExcuse: {
      update: jest.fn(),
    },
    attendanceRecord2: {
      update: jest.fn(),
    },
  };

  // We'll reference a single writable mock for the record update inside transaction
  const mockAttendanceRecordUpdate = jest.fn();

  const mockPrismaService = {
    courseOffering: { findUnique: jest.fn() },
    timetableSlot: { findUnique: jest.fn() },
    instructor: { findUnique: jest.fn() },
    room: { findUnique: jest.fn() },
    attendanceSession: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    enrollment: { findMany: jest.fn() },
    attendanceRecord: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    attendanceExcuse: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // createSession
  // ---------------------------------------------------------------------------
  describe('createSession', () => {
    const dto = {
      courseOfferingId: 'offering-1',
      sessionDate: '2026-10-01T08:00:00.000Z',
      startTime: '08:00:00',
      endTime: '09:30:00',
    };

    it('should create a session successfully', async () => {
      mockPrismaService.courseOffering.findUnique.mockResolvedValue({
        id: 'offering-1',
        instructorId: 'inst-1',
        roomId: 'room-1',
      });
      mockPrismaService.attendanceSession.findUnique.mockResolvedValue(null);
      mockPrismaService.attendanceSession.create.mockResolvedValue({
        id: 'session-1',
        courseOfferingId: 'offering-1',
        status: 'SCHEDULED',
      });

      const result = await service.createSession(dto);

      expect(result).toHaveProperty('id', 'session-1');
      expect(prisma.attendanceSession.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when course offering does not exist', async () => {
      mockPrismaService.courseOffering.findUnique.mockResolvedValue(null);

      await expect(service.createSession(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when session already exists for date/time', async () => {
      mockPrismaService.courseOffering.findUnique.mockResolvedValue({
        id: 'offering-1',
        instructorId: null,
        roomId: null,
      });
      mockPrismaService.attendanceSession.findUnique.mockResolvedValue({
        id: 'existing-session',
      });

      await expect(service.createSession(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when timetable slot does not belong to offering', async () => {
      const dtoWithSlot = {
        ...dto,
        timetableSlotId: 'slot-1',
      };
      mockPrismaService.courseOffering.findUnique.mockResolvedValue({
        id: 'offering-1',
        instructorId: null,
        roomId: null,
      });
      mockPrismaService.timetableSlot.findUnique.mockResolvedValue({
        id: 'slot-1',
        courseOfferingId: 'different-offering', // wrong offering
      });

      await expect(service.createSession(dtoWithSlot)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // submitAttendance
  // ---------------------------------------------------------------------------
  describe('submitAttendance', () => {
    it('should submit roll-call and mark session SUBMITTED', async () => {
      const sessionId = 'session-1';
      const userId = 'user-1';
      const dto = {
        records: [
          { enrollmentId: 'enroll-1', status: 'PRESENT' as const },
          { enrollmentId: 'enroll-2', status: 'ABSENT' as const },
        ],
      };

      mockPrismaService.attendanceSession.findUnique.mockResolvedValue({
        id: sessionId,
        courseOfferingId: 'offering-1',
        status: 'SCHEDULED',
      });
      mockPrismaService.enrollment.findMany.mockResolvedValue([
        { id: 'enroll-1' },
        { id: 'enroll-2' },
      ]);

      const txMock = {
        attendanceRecord: { upsert: jest.fn().mockResolvedValue({}) },
        attendanceSession: {
          update: jest.fn().mockResolvedValue({
            id: sessionId,
            status: 'SUBMITTED',
            attendanceRecords: [],
          }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((cb: any) =>
        cb(txMock),
      );

      const result = await service.submitAttendance(sessionId, dto, userId);

      expect(result.status).toBe('SUBMITTED');
      expect(txMock.attendanceRecord.upsert).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException when session does not exist', async () => {
      mockPrismaService.attendanceSession.findUnique.mockResolvedValue(null);

      await expect(
        service.submitAttendance('bad-id', { records: [] }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when session is LOCKED', async () => {
      mockPrismaService.attendanceSession.findUnique.mockResolvedValue({
        id: 'session-1',
        courseOfferingId: 'offering-1',
        status: 'LOCKED',
      });

      await expect(
        service.submitAttendance('session-1', { records: [] }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when enrollment does not belong to offering', async () => {
      mockPrismaService.attendanceSession.findUnique.mockResolvedValue({
        id: 'session-1',
        courseOfferingId: 'offering-1',
        status: 'SCHEDULED',
      });
      mockPrismaService.enrollment.findMany.mockResolvedValue([
        { id: 'enroll-1' },
      ]);

      const dto = {
        records: [{ enrollmentId: 'enroll-UNKNOWN', status: 'PRESENT' as const }],
      };

      await expect(
        service.submitAttendance('session-1', dto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // submitExcuse
  // ---------------------------------------------------------------------------
  describe('submitExcuse', () => {
    it('should submit an excuse for an ABSENT record', async () => {
      mockPrismaService.attendanceRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        status: 'ABSENT',
        excuse: null,
      });
      mockPrismaService.attendanceExcuse.create.mockResolvedValue({
        id: 'excuse-1',
        status: 'PENDING',
      });

      const dto = {
        reason: 'MEDICAL' as const,
        description: 'Was sick',
      };

      const result = await service.submitExcuse('record-1', dto);

      expect(result).toHaveProperty('id', 'excuse-1');
      expect(prisma.attendanceExcuse.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when record does not exist', async () => {
      mockPrismaService.attendanceRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.submitExcuse('bad-record', { reason: 'MEDICAL' as const, description: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when record is not ABSENT', async () => {
      mockPrismaService.attendanceRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        status: 'PRESENT',
        excuse: null,
      });

      await expect(
        service.submitExcuse('record-1', { reason: 'MEDICAL' as const, description: 'x' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when excuse already exists', async () => {
      mockPrismaService.attendanceRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        status: 'ABSENT',
        excuse: { id: 'excuse-existing' },
      });

      await expect(
        service.submitExcuse('record-1', { reason: 'MEDICAL' as const, description: 'x' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ---------------------------------------------------------------------------
  // reviewExcuse
  // ---------------------------------------------------------------------------
  describe('reviewExcuse', () => {
    it('should approve an excuse and update attendance record to EXCUSED', async () => {
      mockPrismaService.attendanceExcuse.findUnique.mockResolvedValue({
        id: 'excuse-1',
        status: 'PENDING',
        attendanceRecordId: 'record-1',
        attendanceRecord: { id: 'record-1' },
      });

      const txMock = {
        attendanceExcuse: {
          update: jest.fn().mockResolvedValue({ id: 'excuse-1', status: 'APPROVED' }),
        },
        attendanceRecord: {
          update: jest.fn().mockResolvedValue({ id: 'record-1', status: 'EXCUSED' }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((cb: any) => cb(txMock));

      const dto = { status: 'APPROVED' as const };
      const result = await service.reviewExcuse('excuse-1', dto, 'user-1');

      expect(result.status).toBe('APPROVED');
      expect(txMock.attendanceRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'EXCUSED' } }),
      );
    });

    it('should throw NotFoundException when excuse does not exist', async () => {
      mockPrismaService.attendanceExcuse.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewExcuse('bad-excuse', { status: 'APPROVED' as const }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when excuse is already reviewed', async () => {
      mockPrismaService.attendanceExcuse.findUnique.mockResolvedValue({
        id: 'excuse-1',
        status: 'APPROVED', // already reviewed
        attendanceRecordId: 'record-1',
        attendanceRecord: { id: 'record-1' },
      });

      await expect(
        service.reviewExcuse('excuse-1', { status: 'REJECTED' as const }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // getStudentSummary
  // ---------------------------------------------------------------------------
  describe('getStudentSummary', () => {
    it('should return correct attendance percentage', async () => {
      mockPrismaService.attendanceRecord.findMany.mockResolvedValue([
        {
          id: 'r1',
          status: 'PRESENT',
          minutesLate: 0,
          remarks: null,
          attendanceSession: {
            sessionDate: new Date(),
            courseOffering: { course: { code: 'CS101', title: 'Intro' } },
          },
        },
        {
          id: 'r2',
          status: 'ABSENT',
          minutesLate: 0,
          remarks: null,
          attendanceSession: {
            sessionDate: new Date(),
            courseOffering: { course: { code: 'CS101', title: 'Intro' } },
          },
        },
        {
          id: 'r3',
          status: 'LATE',
          minutesLate: 10,
          remarks: null,
          attendanceSession: {
            sessionDate: new Date(),
            courseOffering: { course: { code: 'CS101', title: 'Intro' } },
          },
        },
        {
          id: 'r4',
          status: 'EXCUSED',
          minutesLate: 0,
          remarks: null,
          attendanceSession: {
            sessionDate: new Date(),
            courseOffering: { course: { code: 'CS101', title: 'Intro' } },
          },
        },
      ]);

      const result = await service.getStudentSummary('student-1');

      expect(result.totalSessions).toBe(4);
      expect(result.present).toBe(1);
      expect(result.absent).toBe(1);
      expect(result.late).toBe(1);
      expect(result.excused).toBe(1);
      // (1 present + 1 late + 1 excused) / 4 total = 75%
      expect(result.attendancePercentage).toBe(75);
    });

    it('should return 100% when there are no records', async () => {
      mockPrismaService.attendanceRecord.findMany.mockResolvedValue([]);

      const result = await service.getStudentSummary('student-1');

      expect(result.attendancePercentage).toBe(100);
      expect(result.totalSessions).toBe(0);
    });
  });
});
