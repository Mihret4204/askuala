import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { PrismaService } from '../../database/prisma.service';

describe('CoursesService', () => {
  let service: CoursesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    department: {
      findUnique: jest.fn(),
    },
    program: {
      findUnique: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    coursePrerequisite: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCourse', () => {
    it('should create a course successfully', async () => {
      const dto = {
        departmentId: 'dept-1',
        code: 'SWEG201',
        title: 'Data Structures and Algorithms',
        creditHours: 4,
        lectureHours: 3,
        labHours: 2,
      };

      mockPrismaService.department.findUnique.mockResolvedValue({ id: 'dept-1' });
      mockPrismaService.course.findUnique.mockResolvedValue(null);
      mockPrismaService.course.create.mockResolvedValue({ id: 'course-1', ...dto });

      const result = await service.createCourse(dto);
      expect(result).toHaveProperty('id', 'course-1');
    });

    it('should throw BadRequestException if total contact hours is 0', async () => {
      const dto = {
        departmentId: 'dept-1',
        code: 'SWEG201',
        title: 'Data Structures',
        creditHours: 4,
        lectureHours: 0,
        labHours: 0,
        tutorialHours: 0,
      };

      mockPrismaService.department.findUnique.mockResolvedValue({ id: 'dept-1' });
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(service.createCourse(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('addPrerequisite', () => {
    it('should throw BadRequestException if trying to set course as prerequisite to itself', async () => {
      await expect(
        service.addPrerequisite('course-1', { prerequisiteCourseId: 'course-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
