import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CourseOfferingsService } from './course-offerings.service';
import { PrismaService } from '../../database/prisma.service';

describe('CourseOfferingsService', () => {
  let service: CourseOfferingsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    course: {
      findUnique: jest.fn(),
    },
    semester: {
      findUnique: jest.fn(),
    },
    instructor: {
      findUnique: jest.fn(),
    },
    room: {
      findUnique: jest.fn(),
    },
    courseOffering: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseOfferingsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CourseOfferingsService>(CourseOfferingsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCourseOffering', () => {
    it('should create a course offering successfully', async () => {
      const dto = {
        courseId: 'course-1',
        semesterId: 'sem-1',
        sectionCode: 'SEC-A',
        maxCapacity: 40,
      };

      mockPrismaService.course.findUnique.mockResolvedValue({ id: 'course-1' });
      mockPrismaService.semester.findUnique.mockResolvedValue({ id: 'sem-1' });
      mockPrismaService.courseOffering.findUnique.mockResolvedValue(null);
      mockPrismaService.courseOffering.create.mockResolvedValue({ id: 'offering-1', ...dto });

      const result = await service.createCourseOffering(dto);
      expect(result).toHaveProperty('id', 'offering-1');
    });

    it('should throw NotFoundException if course does not exist', async () => {
      const dto = {
        courseId: 'non-existent',
        semesterId: 'sem-1',
        sectionCode: 'SEC-A',
        maxCapacity: 40,
      };

      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(service.createCourseOffering(dto)).rejects.toThrow(NotFoundException);
    });
  });
});
