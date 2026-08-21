import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { PrismaService } from '../../database/prisma.service';

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let prisma: PrismaService;

  const mockPrismaService = {
    student: {
      findUnique: jest.fn(),
    },
    courseOffering: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    enrollment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EnrollmentService>(EnrollmentService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createEnrollment', () => {
    it('should create an enrollment successfully and increment currentEnrollment', async () => {
      const dto = {
        studentId: 'student-1',
        courseOfferingId: 'offering-1',
      };

      mockPrismaService.student.findUnique.mockResolvedValue({ id: 'student-1' });
      mockPrismaService.courseOffering.findUnique.mockResolvedValue({
        id: 'offering-1',
        courseId: 'course-1',
        status: 'OPEN',
        currentEnrollment: 10,
        maxCapacity: 40,
      });
      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);
      mockPrismaService.enrollment.count.mockResolvedValue(0);
      mockPrismaService.enrollment.create.mockResolvedValue({ id: 'enrollment-1', ...dto, attemptNumber: 1 });

      const result = await service.createEnrollment(dto);
      expect(result).toHaveProperty('id', 'enrollment-1');
      expect(mockPrismaService.courseOffering.update).toHaveBeenCalled();
    });

    it('should throw ConflictException if section capacity is reached', async () => {
      const dto = {
        studentId: 'student-1',
        courseOfferingId: 'offering-1',
      };

      mockPrismaService.student.findUnique.mockResolvedValue({ id: 'student-1' });
      mockPrismaService.courseOffering.findUnique.mockResolvedValue({
        id: 'offering-1',
        courseId: 'course-1',
        status: 'OPEN',
        currentEnrollment: 40,
        maxCapacity: 40,
      });

      await expect(service.createEnrollment(dto)).rejects.toThrow(ConflictException);
    });
  });
});
