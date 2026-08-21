import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { PrismaService } from '../../database/prisma.service';

describe('DepartmentsService', () => {
  let service: DepartmentsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    faculty: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    department: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    instructor: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DepartmentsService>(DepartmentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createFaculty', () => {
    it('should create a new faculty', async () => {
      const dto = { code: 'ENG', name: 'Engineering' };
      mockPrismaService.faculty.findUnique.mockResolvedValue(null);
      mockPrismaService.faculty.create.mockResolvedValue({ id: 'fac-1', ...dto });

      const result = await service.createFaculty(dto);
      expect(result).toHaveProperty('id', 'fac-1');
      expect(prisma.faculty.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if faculty code exists', async () => {
      const dto = { code: 'ENG', name: 'Engineering' };
      mockPrismaService.faculty.findUnique.mockResolvedValue({ id: 'fac-1' });

      await expect(service.createFaculty(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('createDepartment', () => {
    it('should create a new department', async () => {
      const dto = { facultyId: 'fac-1', code: 'CS', name: 'Computer Science' };
      mockPrismaService.faculty.findUnique.mockResolvedValue({ id: 'fac-1' });
      mockPrismaService.department.findUnique.mockResolvedValue(null);
      mockPrismaService.department.create.mockResolvedValue({ id: 'dept-1', ...dto });

      const result = await service.createDepartment(dto);
      expect(result).toHaveProperty('id', 'dept-1');
    });

    it('should throw NotFoundException if faculty does not exist', async () => {
      const dto = { facultyId: 'non-existent', code: 'CS', name: 'Computer Science' };
      mockPrismaService.faculty.findUnique.mockResolvedValue(null);

      await expect(service.createDepartment(dto)).rejects.toThrow(NotFoundException);
    });
  });
});
