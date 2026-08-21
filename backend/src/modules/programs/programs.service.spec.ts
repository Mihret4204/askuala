import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProgramsService } from './programs.service';
import { PrismaService } from '../../database/prisma.service';

describe('ProgramsService', () => {
  let service: ProgramsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    department: {
      findUnique: jest.fn(),
    },
    program: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    student: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgramsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProgramsService>(ProgramsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // createProgram
  // ---------------------------------------------------------------------------
  describe('createProgram', () => {
    const dto = {
      departmentId: 'dept-1',
      code: 'bsc-se',
      name: 'BSc Software Engineering',
      durationYears: 4,
      totalCreditsRequired: 140,
    };

    it('should create a program and normalise the code to uppercase', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue({ id: 'dept-1' });
      mockPrismaService.program.findUnique.mockResolvedValue(null);
      mockPrismaService.program.create.mockResolvedValue({
        id: 'prog-1',
        code: 'BSC-SE',
        name: 'BSc Software Engineering',
        department: { id: 'dept-1' },
      });

      const result = await service.createProgram(dto);

      expect(result).toHaveProperty('id', 'prog-1');
      expect(result.code).toBe('BSC-SE');
      expect(prisma.program.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ code: 'BSC-SE' }),
        }),
      );
    });

    it('should throw NotFoundException when department does not exist', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue(null);

      await expect(service.createProgram(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when program code already exists', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue({ id: 'dept-1' });
      mockPrismaService.program.findUnique.mockResolvedValue({ id: 'prog-existing' });

      await expect(service.createProgram(dto)).rejects.toThrow(ConflictException);
    });
  });

  // ---------------------------------------------------------------------------
  // findAllPrograms
  // ---------------------------------------------------------------------------
  describe('findAllPrograms', () => {
    it('should return all programs with department and faculty', async () => {
      const programs = [
        { id: 'prog-1', code: 'BSC-SE', department: { faculty: { name: 'Engineering' } } },
        { id: 'prog-2', code: 'BSC-CS', department: { faculty: { name: 'Engineering' } } },
      ];
      mockPrismaService.program.findMany.mockResolvedValue(programs);

      const result = await service.findAllPrograms();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id', 'prog-1');
    });

    it('should return an empty array when no programs exist', async () => {
      mockPrismaService.program.findMany.mockResolvedValue([]);

      const result = await service.findAllPrograms();

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // findOneProgram
  // ---------------------------------------------------------------------------
  describe('findOneProgram', () => {
    it('should return a program by id', async () => {
      mockPrismaService.program.findUnique.mockResolvedValue({
        id: 'prog-1',
        code: 'BSC-SE',
        department: { id: 'dept-1' },
        students: [],
      });

      const result = await service.findOneProgram('prog-1');

      expect(result).toHaveProperty('id', 'prog-1');
    });

    it('should throw NotFoundException when program does not exist', async () => {
      mockPrismaService.program.findUnique.mockResolvedValue(null);

      await expect(service.findOneProgram('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // createStudent
  // ---------------------------------------------------------------------------
  describe('createStudent', () => {
    const dto = {
      userId: 'user-1',
      studentIdNumber: 'ugr/12345/16',
      programId: 'prog-1',
      batch: 2024,
    };

    it('should create a student profile and normalise studentIdNumber to uppercase', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.program.findUnique.mockResolvedValue({ id: 'prog-1' });
      mockPrismaService.student.findUnique.mockResolvedValue(null);
      mockPrismaService.student.create.mockResolvedValue({
        id: 'student-1',
        studentIdNumber: 'UGR/12345/16',
        userId: 'user-1',
        programId: 'prog-1',
        batch: 2024,
        user: { id: 'user-1' },
        program: { department: { id: 'dept-1' } },
      });

      const result = await service.createStudent(dto);

      expect(result).toHaveProperty('id', 'student-1');
      expect(result.studentIdNumber).toBe('UGR/12345/16');
      expect(prisma.student.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ studentIdNumber: 'UGR/12345/16' }),
        }),
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.createStudent(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when program does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.program.findUnique.mockResolvedValue(null);

      await expect(service.createStudent(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when student ID number already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.program.findUnique.mockResolvedValue({ id: 'prog-1' });
      mockPrismaService.student.findUnique.mockResolvedValue({ id: 'student-existing' });

      await expect(service.createStudent(dto)).rejects.toThrow(ConflictException);
    });
  });

  // ---------------------------------------------------------------------------
  // findAllStudents
  // ---------------------------------------------------------------------------
  describe('findAllStudents', () => {
    it('should return all students with user and program', async () => {
      const students = [
        {
          id: 'student-1',
          studentIdNumber: 'UGR/001/24',
          user: { id: 'user-1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'STUDENT', status: 'ACTIVE' },
          program: { department: { id: 'dept-1' } },
        },
      ];
      mockPrismaService.student.findMany.mockResolvedValue(students);

      const result = await service.findAllStudents();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('studentIdNumber', 'UGR/001/24');
    });

    it('should return empty array when no students exist', async () => {
      mockPrismaService.student.findMany.mockResolvedValue([]);

      const result = await service.findAllStudents();

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // findOneStudent
  // ---------------------------------------------------------------------------
  describe('findOneStudent', () => {
    it('should return a student profile by id', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue({
        id: 'student-1',
        studentIdNumber: 'UGR/001/24',
        user: { id: 'user-1' },
        program: { department: { id: 'dept-1' } },
      });

      const result = await service.findOneStudent('student-1');

      expect(result).toHaveProperty('id', 'student-1');
      expect(result.studentIdNumber).toBe('UGR/001/24');
    });

    it('should throw NotFoundException when student does not exist', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(null);

      await expect(service.findOneStudent('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
