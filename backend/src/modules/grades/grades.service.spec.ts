import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { GradesService } from './grades.service';
import { PrismaService } from '../../database/prisma.service';
import { GradeApprovalAction } from './dto/approve-grade.dto';

describe('GradesService', () => {
  let service: GradesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    enrollment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    grade: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GradesService>(GradesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // submitGrade
  // ---------------------------------------------------------------------------
  describe('submitGrade', () => {
    const dto = {
      enrollmentId: 'enroll-1',
      letterGrade: 'A',
      gradePoints: 4.0,
    };
    const instructorUserId = 'user-instructor-1';

    it('should create a new grade in SUBMITTED status', async () => {
      mockPrismaService.enrollment.findUnique.mockResolvedValue({
        id: 'enroll-1',
        status: 'ENROLLED',
        courseOffering: { course: { id: 'course-1' } },
      });
      mockPrismaService.grade.findUnique.mockResolvedValue(null);
      mockPrismaService.grade.create.mockResolvedValue({
        id: 'grade-1',
        enrollmentId: 'enroll-1',
        letterGrade: 'A',
        gradePoints: 4.0,
        isPassing: true,
        status: 'SUBMITTED',
      });

      const result = await service.submitGrade(dto, instructorUserId);

      expect(result).toHaveProperty('id', 'grade-1');
      expect(result.status).toBe('SUBMITTED');
      expect(prisma.grade.create).toHaveBeenCalled();
    });

    it('should update an existing DRAFT grade to SUBMITTED', async () => {
      mockPrismaService.enrollment.findUnique.mockResolvedValue({
        id: 'enroll-1',
        status: 'ENROLLED',
        courseOffering: { course: { id: 'course-1' } },
      });
      mockPrismaService.grade.findUnique.mockResolvedValue({
        id: 'grade-1',
        status: 'DRAFT',
      });
      mockPrismaService.grade.update.mockResolvedValue({
        id: 'grade-1',
        letterGrade: 'A',
        status: 'SUBMITTED',
      });

      const result = await service.submitGrade(dto, instructorUserId);

      expect(result.status).toBe('SUBMITTED');
      expect(prisma.grade.update).toHaveBeenCalled();
      expect(prisma.grade.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when enrollment does not exist', async () => {
      mockPrismaService.enrollment.findUnique.mockResolvedValue(null);

      await expect(service.submitGrade(dto, instructorUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when enrollment is DROPPED', async () => {
      mockPrismaService.enrollment.findUnique.mockResolvedValue({
        id: 'enroll-1',
        status: 'DROPPED',
        courseOffering: { course: {} },
      });

      await expect(service.submitGrade(dto, instructorUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when grade is already PUBLISHED', async () => {
      mockPrismaService.enrollment.findUnique.mockResolvedValue({
        id: 'enroll-1',
        status: 'COMPLETED',
        courseOffering: { course: {} },
      });
      mockPrismaService.grade.findUnique.mockResolvedValue({
        id: 'grade-1',
        status: 'PUBLISHED',
      });

      await expect(service.submitGrade(dto, instructorUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when trying to update an APPROVED grade', async () => {
      mockPrismaService.enrollment.findUnique.mockResolvedValue({
        id: 'enroll-1',
        status: 'ENROLLED',
        courseOffering: { course: {} },
      });
      mockPrismaService.grade.findUnique.mockResolvedValue({
        id: 'grade-1',
        status: 'APPROVED',
      });

      await expect(service.submitGrade(dto, instructorUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // approveGrade
  // ---------------------------------------------------------------------------
  describe('approveGrade', () => {
    it('should approve a SUBMITTED grade', async () => {
      mockPrismaService.grade.findUnique.mockResolvedValue({
        id: 'grade-1',
        status: 'SUBMITTED',
      });
      mockPrismaService.grade.update.mockResolvedValue({
        id: 'grade-1',
        status: 'APPROVED',
      });

      const result = await service.approveGrade(
        'grade-1',
        { action: GradeApprovalAction.APPROVE },
        'user-registrar',
      );

      expect(result.status).toBe('APPROVED');
      expect(prisma.grade.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APPROVED' }),
        }),
      );
    });

    it('should reject a SUBMITTED grade back to DRAFT', async () => {
      mockPrismaService.grade.findUnique.mockResolvedValue({
        id: 'grade-1',
        status: 'SUBMITTED',
      });
      mockPrismaService.grade.update.mockResolvedValue({
        id: 'grade-1',
        status: 'DRAFT',
      });

      const result = await service.approveGrade(
        'grade-1',
        { action: GradeApprovalAction.REJECT },
        'user-registrar',
      );

      expect(result.status).toBe('DRAFT');
    });

    it('should throw NotFoundException when grade does not exist', async () => {
      mockPrismaService.grade.findUnique.mockResolvedValue(null);

      await expect(
        service.approveGrade('bad-id', { action: GradeApprovalAction.APPROVE }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when grade is not SUBMITTED', async () => {
      mockPrismaService.grade.findUnique.mockResolvedValue({
        id: 'grade-1',
        status: 'DRAFT', // not SUBMITTED
      });

      await expect(
        service.approveGrade('grade-1', { action: GradeApprovalAction.APPROVE }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // publishGrade
  // ---------------------------------------------------------------------------
  describe('publishGrade', () => {
    it('should publish an APPROVED grade and update enrollment to COMPLETED', async () => {
      mockPrismaService.grade.findUnique.mockResolvedValue({
        id: 'grade-1',
        status: 'APPROVED',
      });

      const txMock = {
        grade: {
          update: jest.fn().mockResolvedValue({
            id: 'grade-1',
            status: 'PUBLISHED',
            enrollmentId: 'enroll-1',
            isPassing: true,
          }),
        },
        enrollment: {
          update: jest.fn().mockResolvedValue({ id: 'enroll-1', status: 'COMPLETED' }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((cb: any) => cb(txMock));

      const result = await service.publishGrade('grade-1');

      expect(result.status).toBe('PUBLISHED');
      expect(txMock.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });

    it('should set enrollment to FAILED when grade is not passing', async () => {
      mockPrismaService.grade.findUnique.mockResolvedValue({
        id: 'grade-1',
        status: 'APPROVED',
      });

      const txMock = {
        grade: {
          update: jest.fn().mockResolvedValue({
            id: 'grade-1',
            status: 'PUBLISHED',
            enrollmentId: 'enroll-1',
            isPassing: false, // failing grade
          }),
        },
        enrollment: {
          update: jest.fn().mockResolvedValue({ id: 'enroll-1', status: 'FAILED' }),
        },
      };
      mockPrismaService.$transaction.mockImplementation((cb: any) => cb(txMock));

      await service.publishGrade('grade-1');

      expect(txMock.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
    });

    it('should throw NotFoundException when grade does not exist', async () => {
      mockPrismaService.grade.findUnique.mockResolvedValue(null);

      await expect(service.publishGrade('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when grade is not APPROVED', async () => {
      mockPrismaService.grade.findUnique.mockResolvedValue({
        id: 'grade-1',
        status: 'SUBMITTED', // not APPROVED
      });

      await expect(service.publishGrade('grade-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateGpa
  // ---------------------------------------------------------------------------
  describe('calculateGpa', () => {
    it('should calculate cumulative GPA correctly', async () => {
      mockPrismaService.grade.findMany.mockResolvedValue([
        {
          gradePoints: { valueOf: () => 4.0, toString: () => '4.0' },
          isPassing: true,
          enrollment: {
            courseOffering: {
              course: { creditHours: { valueOf: () => 3, toString: () => '3' } },
            },
          },
        },
        {
          gradePoints: { valueOf: () => 3.0, toString: () => '3.0' },
          isPassing: true,
          enrollment: {
            courseOffering: {
              course: { creditHours: { valueOf: () => 3, toString: () => '3' } },
            },
          },
        },
      ]);

      const result = await service.calculateGpa('student-1');

      // (4.0*3 + 3.0*3) / 6 = 21/6 = 3.5
      expect(result.gpa).toBe(3.5);
      expect(result.totalCreditAttempted).toBe(6);
      expect(result.totalCreditEarned).toBe(6);
      expect(result.gradeCount).toBe(2);
    });

    it('should return GPA 0 when no grades exist', async () => {
      mockPrismaService.grade.findMany.mockResolvedValue([]);

      const result = await service.calculateGpa('student-1');

      expect(result.gpa).toBe(0);
      expect(result.gradeCount).toBe(0);
    });

    it('should not count failing courses in earned credits', async () => {
      mockPrismaService.grade.findMany.mockResolvedValue([
        {
          gradePoints: { valueOf: () => 0.0, toString: () => '0.0' },
          isPassing: false,
          enrollment: {
            courseOffering: {
              course: { creditHours: { valueOf: () => 3, toString: () => '3' } },
            },
          },
        },
      ]);

      const result = await service.calculateGpa('student-1');

      expect(result.totalCreditAttempted).toBe(3);
      expect(result.totalCreditEarned).toBe(0);
      expect(result.gpa).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // findGradeByEnrollment
  // ---------------------------------------------------------------------------
  describe('findGradeByEnrollment', () => {
    it('should return grade for an enrollment', async () => {
      mockPrismaService.grade.findUnique.mockResolvedValue({
        id: 'grade-1',
        enrollmentId: 'enroll-1',
        letterGrade: 'B+',
        status: 'PUBLISHED',
      });

      const result = await service.findGradeByEnrollment('enroll-1');

      expect(result).toHaveProperty('id', 'grade-1');
    });

    it('should throw NotFoundException when no grade exists for enrollment', async () => {
      mockPrismaService.grade.findUnique.mockResolvedValue(null);

      await expect(service.findGradeByEnrollment('enroll-none')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
