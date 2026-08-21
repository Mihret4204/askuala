import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { PrismaService } from '../../database/prisma.service';

describe('TimetableService', () => {
  let service: TimetableService;
  let prisma: PrismaService;

  const mockPrismaService = {
    courseOffering: {
      findUnique: jest.fn(),
    },
    room: {
      findUnique: jest.fn(),
    },
    instructor: {
      findUnique: jest.fn(),
    },
    timetableSlot: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetableService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TimetableService>(TimetableService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTimetableSlot', () => {
    it('should create a timetable slot successfully', async () => {
      const dto = {
        courseOfferingId: 'offering-1',
        roomId: 'room-1',
        dayOfWeek: 'MONDAY' as any,
        startTime: '08:30:00',
        endTime: '10:00:00',
      };

      mockPrismaService.courseOffering.findUnique.mockResolvedValue({ id: 'offering-1' });
      mockPrismaService.room.findUnique.mockResolvedValue({ id: 'room-1', code: 'ENG-201' });
      mockPrismaService.timetableSlot.findFirst.mockResolvedValue(null);
      mockPrismaService.timetableSlot.create.mockResolvedValue({ id: 'slot-1', ...dto });

      const result = await service.createTimetableSlot(dto);
      expect(result).toHaveProperty('id', 'slot-1');
    });

    it('should throw BadRequestException if startTime >= endTime', async () => {
      const dto = {
        courseOfferingId: 'offering-1',
        roomId: 'room-1',
        dayOfWeek: 'MONDAY' as any,
        startTime: '10:00:00',
        endTime: '08:30:00',
      };

      mockPrismaService.courseOffering.findUnique.mockResolvedValue({ id: 'offering-1' });
      mockPrismaService.room.findUnique.mockResolvedValue({ id: 'room-1' });

      await expect(service.createTimetableSlot(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException on room schedule collision', async () => {
      const dto = {
        courseOfferingId: 'offering-1',
        roomId: 'room-1',
        dayOfWeek: 'MONDAY' as any,
        startTime: '08:30:00',
        endTime: '10:00:00',
      };

      mockPrismaService.courseOffering.findUnique.mockResolvedValue({ id: 'offering-1' });
      mockPrismaService.room.findUnique.mockResolvedValue({ id: 'room-1', code: 'ENG-201' });
      mockPrismaService.timetableSlot.findFirst.mockResolvedValue({
        id: 'slot-conflict',
        startTime: '08:00:00',
        endTime: '09:00:00',
        courseOffering: { course: { code: 'CS101' } },
      });

      await expect(service.createTimetableSlot(dto)).rejects.toThrow(ConflictException);
    });
  });
});
