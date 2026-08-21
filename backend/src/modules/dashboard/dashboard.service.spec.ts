import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../database/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: PrismaService;

  const mockPrismaService = {
    student: {
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    instructor: {
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    faculty: { count: jest.fn() },
    department: { count: jest.fn() },
    program: { count: jest.fn() },
    course: { count: jest.fn() },
    semester: { findFirst: jest.fn() },
    courseOffering: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    enrollment: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    grade: { count: jest.fn() },
    attendanceRecord: { groupBy: jest.fn() },
    attendanceExcuse: { count: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // getSystemOverview
  // ---------------------------------------------------------------------------
  describe('getSystemOverview', () => {
    const setupSystemCounts = (semesterOverride: any = null) => {
      // Promise.all resolves its arguments in order — mock each count call
      // Order: totalStudents, activeStudents, totalInstructors, activeInstructors,
      //        totalFaculties, totalDepartments, totalPrograms, totalCourses, currentSemester
      mockPrismaService.student.count
        .mockResolvedValueOnce(200)   // total
        .mockResolvedValueOnce(180);  // active
      mockPrismaService.instructor.count
        .mockResolvedValueOnce(40)    // total
        .mockResolvedValueOnce(38);   // active
      mockPrismaService.faculty.count.mockResolvedValue(5);
      mockPrismaService.department.count.mockResolvedValue(12);
      mockPrismaService.program.count.mockResolvedValue(20);
      mockPrismaService.course.count.mockResolvedValue(150);
      mockPrismaService.semester.findFirst.mockResolvedValue(semesterOverride);
    };

    it('should return institution and people counts', async () => {
      setupSystemCounts();

      const result = await service.getSystemOverview();

      expect(result.institution.totalFaculties).toBe(5);
      expect(result.institution.totalDepartments).toBe(12);
      expect(result.institution.totalPrograms).toBe(20);
      expect(result.institution.totalCourses).toBe(150);
      expect(result.people.totalStudents).toBe(200);
      expect(result.people.activeStudents).toBe(180);
      expect(result.people.totalInstructors).toBe(40);
      expect(result.people.activeInstructors).toBe(38);
    });

    it('should set currentSemester to null when no active semester exists', async () => {
      setupSystemCounts(null);

      const result = await service.getSystemOverview();

      expect(result.currentSemester).toBeNull();
    });

    it('should include currentSemester stats when an active semester exists', async () => {
      const currentSemester = {
        id: 'sem-1',
        code: 'SEM-2024-1',
        name: 'Semester 1 2024',
        status: 'ACTIVE',
        academicYear: { yearCode: '2024/2025' },
      };
      setupSystemCounts(currentSemester);

      // Second Promise.all: openOfferings, totalEnrollments, completedOfferings
      mockPrismaService.courseOffering.count
        .mockResolvedValueOnce(25)   // open
        .mockResolvedValueOnce(10);  // completed
      mockPrismaService.enrollment.count.mockResolvedValue(320);

      const result = await service.getSystemOverview();

      expect(result.currentSemester).not.toBeNull();
      const sem = result.currentSemester as any;
      expect(sem.code).toBe('SEM-2024-1');
      expect(sem.openOfferings).toBe(25);
      expect(sem.totalEnrollments).toBe(320);
      expect(sem.completedOfferings).toBe(10);
    });

    it('should always include a generatedAt timestamp', async () => {
      setupSystemCounts();

      const result = await service.getSystemOverview();

      expect(result.generatedAt).toBeDefined();
      expect(new Date(result.generatedAt).getTime()).not.toBeNaN();
    });
  });

  // ---------------------------------------------------------------------------
  // getStudentDashboard
  // ---------------------------------------------------------------------------
  describe('getStudentDashboard', () => {
    const makeStudent = () => ({
      id: 'student-1',
      studentIdNumber: 'UGR/001/24',
      batch: 2024,
      status: 'ACTIVE',
      user: { firstName: 'Alice', lastName: 'Smith', email: 's@uni.edu' },
      program: {
        name: 'BSc SE',
        department: {
          name: 'CS',
          faculty: { name: 'Engineering' },
        },
      },
    });

    it('should return null when student does not exist', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(null);

      const result = await service.getStudentDashboard('bad-id');

      expect(result).toBeNull();
    });

    it('should return student dashboard with correct attendance percentage', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      mockPrismaService.semester.findFirst.mockResolvedValue({
        id: 'sem-1',
        code: 'SEM-1',
        name: 'Semester 1',
      });
      mockPrismaService.enrollment.findMany.mockResolvedValue([
        {
          id: 'enroll-1',
          enrollmentType: 'CREDIT',
          courseOffering: {
            course: {
              code: 'CS101',
              title: 'Intro',
              creditHours: 3,
            },
            sectionCode: 'A',
            instructor: {
              user: { firstName: 'Prof', lastName: 'Doe' },
            },
            timetableSlots: [{ id: 'slot-1' }, { id: 'slot-2' }],
          },
        },
      ]);
      mockPrismaService.grade.count.mockResolvedValue(5);
      // 10 present, 2 late, 3 absent, 1 excused  → attended = 10+2+1 = 13 / 16 = 81.25%
      mockPrismaService.attendanceRecord.groupBy.mockResolvedValue([
        { status: 'PRESENT', _count: { status: 10 } },
        { status: 'LATE', _count: { status: 2 } },
        { status: 'ABSENT', _count: { status: 3 } },
        { status: 'EXCUSED', _count: { status: 1 } },
      ]);

      const result = await service.getStudentDashboard('student-1');

      expect(result).not.toBeNull();
      expect(result!.student.fullName).toBe('Alice Smith');
      expect(result!.attendance.PRESENT).toBe(10);
      expect(result!.attendance.ABSENT).toBe(3);
      expect(result!.attendance.totalRecords).toBe(16);
      expect(result!.attendance.attendancePercentage).toBe(81.25);
      expect(result!.grades.publishedGradesCount).toBe(5);
    });

    it('should return 100% attendance when there are no records', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      mockPrismaService.semester.findFirst.mockResolvedValue(null);
      mockPrismaService.enrollment.findMany.mockResolvedValue([]);
      mockPrismaService.grade.count.mockResolvedValue(0);
      mockPrismaService.attendanceRecord.groupBy.mockResolvedValue([]);

      const result = await service.getStudentDashboard('student-1');

      expect(result!.attendance.attendancePercentage).toBe(100);
      expect(result!.attendance.totalRecords).toBe(0);
    });

    it('should map enrollments to a flat summary shape', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      mockPrismaService.semester.findFirst.mockResolvedValue(null);
      mockPrismaService.enrollment.findMany.mockResolvedValue([
        {
          id: 'enroll-1',
          enrollmentType: 'CREDIT',
          courseOffering: {
            course: { code: 'CS101', title: 'Intro', creditHours: 3 },
            sectionCode: 'A',
            instructor: null, // no instructor assigned
            timetableSlots: [],
          },
        },
      ]);
      mockPrismaService.grade.count.mockResolvedValue(0);
      mockPrismaService.attendanceRecord.groupBy.mockResolvedValue([]);

      const result = await service.getStudentDashboard('student-1');

      expect(result!.enrollments).toHaveLength(1);
      expect(result!.enrollments[0].courseCode).toBe('CS101');
      expect(result!.enrollments[0].instructor).toBeNull();
      expect(result!.enrollments[0].timetableSlotCount).toBe(0);
    });

    it('should set currentSemester to null when no active semester exists', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(makeStudent());
      mockPrismaService.semester.findFirst.mockResolvedValue(null);
      mockPrismaService.enrollment.findMany.mockResolvedValue([]);
      mockPrismaService.grade.count.mockResolvedValue(0);
      mockPrismaService.attendanceRecord.groupBy.mockResolvedValue([]);

      const result = await service.getStudentDashboard('student-1');

      expect(result!.currentSemester).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getInstructorDashboard
  // ---------------------------------------------------------------------------
  describe('getInstructorDashboard', () => {
    const makeInstructor = () => ({
      id: 'instructor-1',
      employeeId: 'EMP-001',
      title: 'Dr.',
      officeLocation: 'Block A',
      user: { firstName: 'Bob', lastName: 'Jones', email: 'b@uni.edu' },
      department: { name: 'Computer Science' },
    });

    it('should return null when instructor does not exist', async () => {
      mockPrismaService.instructor.findUnique.mockResolvedValue(null);

      const result = await service.getInstructorDashboard('bad-id');

      expect(result).toBeNull();
    });

    it('should return instructor dashboard with offerings and pending action counts', async () => {
      mockPrismaService.instructor.findUnique.mockResolvedValue(makeInstructor());
      mockPrismaService.semester.findFirst.mockResolvedValue({
        id: 'sem-1',
        code: 'SEM-1',
        name: 'Semester 1',
      });
      mockPrismaService.courseOffering.findMany.mockResolvedValue([
        {
          id: 'offer-1',
          sectionCode: 'A',
          status: 'OPEN',
          maxCapacity: 40,
          course: { code: 'CS101', title: 'Intro' },
          room: {
            roomNumber: '101',
            building: { code: 'BLK-A' },
          },
          _count: { enrollments: 30 },
        },
      ]);
      mockPrismaService.enrollment.count.mockResolvedValue(5);    // pending grades
      mockPrismaService.attendanceExcuse.count.mockResolvedValue(3); // pending excuses

      const result = await service.getInstructorDashboard('instructor-1');

      expect(result).not.toBeNull();
      expect(result!.instructor.fullName).toBe('Bob Jones');
      expect(result!.instructor.department).toBe('Computer Science');
      expect(result!.offerings).toHaveLength(1);
      expect(result!.offerings[0].enrolledCount).toBe(30);
      expect(result!.offerings[0].room).toBe('BLK-A-101');
      expect(result!.actions.pendingGradesToSubmit).toBe(5);
      expect(result!.actions.pendingExcusesToReview).toBe(3);
    });

    it('should set room to null when no room is assigned to an offering', async () => {
      mockPrismaService.instructor.findUnique.mockResolvedValue(makeInstructor());
      mockPrismaService.semester.findFirst.mockResolvedValue(null);
      mockPrismaService.courseOffering.findMany.mockResolvedValue([
        {
          id: 'offer-1',
          sectionCode: 'A',
          status: 'PLANNED',
          maxCapacity: 40,
          course: { code: 'CS101', title: 'Intro' },
          room: null, // no room
          _count: { enrollments: 0 },
        },
      ]);
      mockPrismaService.enrollment.count.mockResolvedValue(0);
      mockPrismaService.attendanceExcuse.count.mockResolvedValue(0);

      const result = await service.getInstructorDashboard('instructor-1');

      expect(result!.offerings[0].room).toBeNull();
    });

    it('should return empty offerings when instructor has none this semester', async () => {
      mockPrismaService.instructor.findUnique.mockResolvedValue(makeInstructor());
      mockPrismaService.semester.findFirst.mockResolvedValue({
        id: 'sem-1',
        code: 'SEM-1',
        name: 'Semester 1',
      });
      mockPrismaService.courseOffering.findMany.mockResolvedValue([]);
      mockPrismaService.enrollment.count.mockResolvedValue(0);
      mockPrismaService.attendanceExcuse.count.mockResolvedValue(0);

      const result = await service.getInstructorDashboard('instructor-1');

      expect(result!.offerings).toHaveLength(0);
      expect(result!.actions.pendingGradesToSubmit).toBe(0);
    });

    it('should set currentSemester to null when no active semester exists', async () => {
      mockPrismaService.instructor.findUnique.mockResolvedValue(makeInstructor());
      mockPrismaService.semester.findFirst.mockResolvedValue(null);
      mockPrismaService.courseOffering.findMany.mockResolvedValue([]);
      mockPrismaService.enrollment.count.mockResolvedValue(0);
      mockPrismaService.attendanceExcuse.count.mockResolvedValue(0);

      const result = await service.getInstructorDashboard('instructor-1');

      expect(result!.currentSemester).toBeNull();
    });
  });
});
