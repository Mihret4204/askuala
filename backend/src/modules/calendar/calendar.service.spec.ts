import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { PrismaService } from '../../database/prisma.service';

describe('CalendarService', () => {
  let service: CalendarService;
  let prisma: PrismaService;

  const mockPrismaService = {
    academicYear: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    semester: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAcademicYear', () => {
    it('should create an academic year successfully', async () => {
      const dto = {
        yearCode: '2026/2027',
        title: 'Academic Year 2026-2027',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2027-06-30T00:00:00.000Z',
      };

      mockPrismaService.academicYear.findUnique.mockResolvedValue(null);
      mockPrismaService.academicYear.create.mockResolvedValue({
        id: 'ay-1',
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isCurrent: false,
        status: 'PLANNED',
      });

      const result = await service.createAcademicYear(dto);
      expect(result).toHaveProperty('id', 'ay-1');
    });

    it('should throw BadRequestException if end date is before start date', async () => {
      const dto = {
        yearCode: '2026/2027',
        title: 'Academic Year 2026-2027',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-01-01T00:00:00.000Z',
      };

      await expect(service.createAcademicYear(dto)).rejects.toThrow(BadRequestException);
    });
  });
});
