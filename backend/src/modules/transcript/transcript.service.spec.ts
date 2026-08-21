import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TranscriptService } from './transcript.service';
import { PrismaService } from '../../database/prisma.service';

// ---------------------------------------------------------------------------
// Helpers – build reusable mock objects that match Prisma include shapes
// ---------------------------------------------------------------------------

const makeStudent = (overrides: Partial<any> = {}) => ({
  id: 'student-1',
  studentIdNumber: 'UGR/001/24',
  batch: 2024,
  status: 'ACTIVE',
  user: { id: 'user-1', email: 's@uni.edu', firstName: 'Alice', lastName: 'Smith' },
  program: {
    code: 'BSC-SE',
    name: 'BSc Software Engineering',
    degreeType: 'BACHELOR',
    totalCreditsRequired: 140,
    department: {
      name: 'Computer Science',
      faculty: { name: 'Engineering' },
    },
  },
  admissionSemester: {
    code: 'SEM-2024-1',
    name: 'Semester 1 2024',
    academicYear: { yearCode: '2024/2025' },
  },
  ...overrides,
});

const makeSemester = (id: string, code: string) => ({
  id,
  code,
  name: `Semester ${code}`,
  termType: 'SEMESTER_1',
  startDate: new Date('2024-09-01'),
  academicYear: { yearCode: '2024/2025' },
});

const makeGrade = (
  semId: string,
  letterGrade: string,
  gradePoints: number,
  creditHours: number,
  isPassing = true,
) => ({
  letterGrade,
  gradePoints: { valueOf: () => gradePoints },
  percentageScore: null,
  isPassing,
  status: 'PUBLISHED',
  enrollment: {
    courseOffering: {
      course: {
        code: 'CS101',
        title: 'Intro to CS',
        creditHours: { valueOf: () => creditHours },
      },
      semester: makeSemester(semId, `SEM-${semId}`),
    },
  },
});

describe('TranscriptService', () => {
  let service: TranscriptService;
  let prisma: PrismaService;

  const mockPrismaService = {
    student: { findUnique: jest.fn() },
    grade: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscriptService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TranscriptService>(TranscriptService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // generateTranscript
  // ---------------------------------------------------------------------------
  describe('generateTranscript', () => {
    it('should throw NotFoundException when student does not exist', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(null);

      await expect(service.generateTranscript('bad-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.grade.findMany).not.toHaveBeenCalled();
    });

    it('should return a transcript with an empty semesters array when student has no grades', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      mockPrismaService.grade.findMany.mockResolvedValue([]);

      const result = await service.generateTranscript('student-1');

      expect(result.student.id).toBe('student-1');
      expect(result.student.fullName).toBe('Alice Smith');
      expect(result.semesters).toHaveLength(0);
      expect(result.summary.cumulativeGpa).toBe(0);
      expect(result.summary.gradeCount).toBe(0);
      expect(result.summary.isEligibleForGraduation).toBe(false);
    });

    it('should group grades into the correct semester', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      mockPrismaService.grade.findMany.mockResolvedValue([
        makeGrade('sem-1', 'A', 4.0, 3),
        makeGrade('sem-1', 'B+', 3.33, 3),
      ]);

      const result = await service.generateTranscript('student-1');

      expect(result.semesters).toHaveLength(1);
      expect(result.semesters[0].courses).toHaveLength(2);
      expect(result.semesters[0].semesterCreditsAttempted).toBe(6);
    });

    it('should group grades from two different semesters into two blocks', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      mockPrismaService.grade.findMany.mockResolvedValue([
        makeGrade('sem-1', 'A', 4.0, 3),
        makeGrade('sem-2', 'C', 2.0, 3),
      ]);

      const result = await service.generateTranscript('student-1');

      expect(result.semesters).toHaveLength(2);
    });

    it('should calculate semester GPA correctly', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      // 4.0*3 + 3.0*3 = 21 quality points, 6 credits → GPA = 3.5
      mockPrismaService.grade.findMany.mockResolvedValue([
        makeGrade('sem-1', 'A', 4.0, 3),
        makeGrade('sem-1', 'B', 3.0, 3),
      ]);

      const result = await service.generateTranscript('student-1');

      expect(result.semesters[0].semesterGpa).toBe(3.5);
    });

    it('should calculate cumulative GPA across multiple semesters', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      // sem-1: 4.0*3 = 12 QP, 3 credits
      // sem-2: 2.0*3 = 6 QP, 3 credits
      // cumulative = 18/6 = 3.0
      mockPrismaService.grade.findMany.mockResolvedValue([
        makeGrade('sem-1', 'A', 4.0, 3),
        makeGrade('sem-2', 'C', 2.0, 3),
      ]);

      const result = await service.generateTranscript('student-1');

      expect(result.summary.cumulativeGpa).toBe(3.0);
      expect(result.summary.totalCreditsAttempted).toBe(6);
      expect(result.summary.totalCreditsEarned).toBe(6);
    });

    it('should not count failed courses in earned credits', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      mockPrismaService.grade.findMany.mockResolvedValue([
        makeGrade('sem-1', 'A', 4.0, 3, true),
        makeGrade('sem-1', 'F', 0.0, 3, false), // failing
      ]);

      const result = await service.generateTranscript('student-1');

      expect(result.summary.totalCreditsAttempted).toBe(6);
      expect(result.summary.totalCreditsEarned).toBe(3); // only passing
    });

    it('should expose admissionSemester when present', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      mockPrismaService.grade.findMany.mockResolvedValue([]);

      const result = await service.generateTranscript('student-1');

      expect(result.admissionSemester).not.toBeNull();
      expect(result.admissionSemester!.code).toBe('SEM-2024-1');
    });

    it('should set admissionSemester to null when student has none', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(
        makeStudent({ admissionSemester: null }),
      );
      mockPrismaService.grade.findMany.mockResolvedValue([]);

      const result = await service.generateTranscript('student-1');

      expect(result.admissionSemester).toBeNull();
    });

    it('should flag isEligibleForGraduation when credits and GPA requirements are met', async () => {
      // Program requires 140 credits; give 140 credits earned and GPA ≥ 2.0
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());

      // 140 grades × 1 credit each at 3.0 GP
      const grades = Array.from({ length: 140 }, (_, i) =>
        makeGrade(`sem-${Math.floor(i / 35) + 1}`, 'B', 3.0, 1, true),
      );
      mockPrismaService.grade.findMany.mockResolvedValue(grades);

      const result = await service.generateTranscript('student-1');

      expect(result.summary.totalCreditsEarned).toBe(140);
      expect(result.summary.isEligibleForGraduation).toBe(true);
    });

    it('should NOT flag isEligibleForGraduation when credits are insufficient', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      // Only 3 credits earned — far below 140 required
      mockPrismaService.grade.findMany.mockResolvedValue([
        makeGrade('sem-1', 'A', 4.0, 3, true),
      ]);

      const result = await service.generateTranscript('student-1');

      expect(result.summary.isEligibleForGraduation).toBe(false);
    });

    it('should include program info in the response', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      mockPrismaService.grade.findMany.mockResolvedValue([]);

      const result = await service.generateTranscript('student-1');

      expect(result.program.code).toBe('BSC-SE');
      expect(result.program.department).toBe('Computer Science');
      expect(result.program.faculty).toBe('Engineering');
    });

    it('should always include a generatedAt timestamp', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      mockPrismaService.grade.findMany.mockResolvedValue([]);

      const result = await service.generateTranscript('student-1');

      expect(result.generatedAt).toBeDefined();
      expect(new Date(result.generatedAt).getTime()).not.toBeNaN();
    });
  });

  // ---------------------------------------------------------------------------
  // getTranscriptSummary
  // ---------------------------------------------------------------------------
  describe('getTranscriptSummary', () => {
    it('should throw NotFoundException when student does not exist', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(null);

      await expect(service.getTranscriptSummary('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return zero GPA when student has no grades', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      mockPrismaService.grade.findMany.mockResolvedValue([]);

      const result = await service.getTranscriptSummary('student-1');

      expect(result.cumulativeGpa).toBe(0);
      expect(result.totalCreditsAttempted).toBe(0);
      expect(result.totalCreditsEarned).toBe(0);
      expect(result.isEligibleForGraduation).toBe(false);
    });

    it('should compute correct GPA from grades', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      // 4.0*3 + 3.0*3 = 21 QP / 6 credits = 3.5 GPA
      mockPrismaService.grade.findMany.mockResolvedValue([
        makeGrade('sem-1', 'A', 4.0, 3, true),
        makeGrade('sem-1', 'B', 3.0, 3, true),
      ]);

      const result = await service.getTranscriptSummary('student-1');

      expect(result.cumulativeGpa).toBe(3.5);
      expect(result.totalCreditsEarned).toBe(6);
    });

    it('should not count failed credits in earned total', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      mockPrismaService.grade.findMany.mockResolvedValue([
        makeGrade('sem-1', 'A', 4.0, 3, true),
        makeGrade('sem-1', 'F', 0.0, 3, false),
      ]);

      const result = await service.getTranscriptSummary('student-1');

      expect(result.totalCreditsAttempted).toBe(6);
      expect(result.totalCreditsEarned).toBe(3);
    });

    it('should return student identity fields', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      mockPrismaService.grade.findMany.mockResolvedValue([]);

      const result = await service.getTranscriptSummary('student-1');

      expect(result.studentId).toBe('student-1');
      expect(result.studentIdNumber).toBe('UGR/001/24');
      expect(result.fullName).toBe('Alice Smith');
      expect(result.programCode).toBe('BSC-SE');
      expect(result.degreeType).toBe('BACHELOR');
    });

    it('should flag eligibility only when both conditions are satisfied', async () => {
      // 140 credits earned, GPA = 3.0 → eligible
      const gradesEligible = Array.from({ length: 140 }, () =>
        makeGrade('sem-1', 'B', 3.0, 1, true),
      );
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      mockPrismaService.grade.findMany.mockResolvedValue(gradesEligible);

      const resultEligible = await service.getTranscriptSummary('student-1');
      expect(resultEligible.isEligibleForGraduation).toBe(true);

      // reset and try with low GPA
      jest.clearAllMocks();
      const gradesLowGpa = Array.from({ length: 140 }, () =>
        makeGrade('sem-1', 'F', 0.0, 1, false),
      );
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      mockPrismaService.grade.findMany.mockResolvedValue(gradesLowGpa);

      const resultNotEligible = await service.getTranscriptSummary('student-1');
      expect(resultNotEligible.isEligibleForGraduation).toBe(false);
    });
  });
});
