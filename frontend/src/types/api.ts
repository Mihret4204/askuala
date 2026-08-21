// ---------------------------------------------------------------------------
// API error shape — produced by the backend HttpExceptionFilter
// ---------------------------------------------------------------------------
export interface ApiErrorShape {
  message: string;
  status?: number;
  code?: string;
}

// ---------------------------------------------------------------------------
// Role enum — mirrors backend src/common/enums/role.enum.ts exactly
// ---------------------------------------------------------------------------
export type UserRole =
  | 'ADMIN'
  | 'REGISTRAR'
  | 'FACULTY_DEAN'
  | 'HOD'
  | 'INSTRUCTOR'
  | 'STUDENT';

export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED';

// ---------------------------------------------------------------------------
// User shape returned by the backend auth endpoints.
//
// POST /auth/register  → includes createdAt
// POST /auth/login     → no createdAt
// GET  /auth/me        → no createdAt (comes from JwtStrategy.validate select)
//
// createdAt is therefore optional so one type covers all three cases.
// ---------------------------------------------------------------------------
export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: AccountStatus;
  createdAt?: string; // ISO string, only present on register response
}

// ---------------------------------------------------------------------------
// Response shapes for POST /auth/login and POST /auth/register
// ---------------------------------------------------------------------------
export interface AuthResponse {
  user: UserSummary;
  accessToken: string;
}

// ---------------------------------------------------------------------------
// Frontend auth store state shape
// ---------------------------------------------------------------------------
export interface AuthState {
  user: UserSummary | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
}

// ---------------------------------------------------------------------------
// Request payload types (match backend DTOs exactly)
// ---------------------------------------------------------------------------
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

// ---------------------------------------------------------------------------
// Dashboard response types — matching backend DashboardService exactly
// ---------------------------------------------------------------------------

export interface CurrentSemesterStats {
  id: string;
  code: string;
  name: string;
  academicYear: string;
  status: string;
  openOfferings: number;
  totalEnrollments: number;
  completedOfferings: number;
}

export interface SystemOverview {
  institution: {
    totalFaculties: number;
    totalDepartments: number;
    totalPrograms: number;
    totalCourses: number;
  };
  people: {
    totalStudents: number;
    activeStudents: number;
    totalInstructors: number;
    activeInstructors: number;
  };
  currentSemester: CurrentSemesterStats | null;
  generatedAt: string;
}

export interface EnrollmentSummary {
  id: string;
  courseCode: string;
  courseTitle: string;
  creditHours: number;
  sectionCode: string;
  instructor: string | null;
  timetableSlotCount: number;
  enrollmentType: string;
}

export interface AttendanceSummary {
  PRESENT: number;
  LATE: number;
  ABSENT: number;
  EXCUSED: number;
  totalRecords: number;
  attendancePercentage: number;
}

export interface StudentDashboard {
  student: {
    id: string;
    studentIdNumber: string;
    fullName: string;
    email: string;
    program: string;
    department: string;
    faculty: string;
    batch: number;
    status: string;
  };
  currentSemester: { id: string; code: string; name: string } | null;
  enrollments: EnrollmentSummary[];
  attendance: AttendanceSummary;
  grades: { publishedGradesCount: number };
  generatedAt: string;
}

export interface OfferingSummary {
  id: string;
  courseCode: string;
  courseTitle: string;
  sectionCode: string;
  status: string;
  enrolledCount: number;
  maxCapacity: number;
  room: string | null;
}

export interface InstructorDashboard {
  instructor: {
    id: string;
    employeeId: string;
    fullName: string;
    email: string;
    title: string | null;
    department: string;
    officeLocation: string | null;
  };
  currentSemester: { id: string; code: string; name: string } | null;
  offerings: OfferingSummary[];
  actions: {
    pendingGradesToSubmit: number;
    pendingExcusesToReview: number;
  };
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Core Academic Structure — response types matching backend service returns
// ---------------------------------------------------------------------------

// --- Users ---
export interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
}

export interface UserDetail extends UserRecord {
  studentProfile: StudentProfile | null;
  instructorProfile: InstructorRecord | null;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

// --- Faculties ---
export interface FacultyRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  establishedYear: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  departments: DepartmentRecord[];
}

export interface CreateFacultyPayload {
  code: string;
  name: string;
  description?: string;
  establishedYear?: number;
}

// --- Departments ---
export interface DepartmentRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  facultyId: string;
  faculty: Pick<FacultyRecord, 'id' | 'code' | 'name'>;
  headInstructor: InstructorRecord | null;
  programs: ProgramRecord[];
}

export interface DepartmentDetail extends DepartmentRecord {
  instructors: InstructorRecord[];
}

export interface CreateDepartmentPayload {
  facultyId: string;
  code: string;
  name: string;
  description?: string;
  headInstructorId?: string;
}

// --- Instructors ---
export interface InstructorRecord {
  id: string;
  employeeId: string;
  title: string | null;
  officeLocation: string | null;
  status: string;
  userId: string;
  departmentId: string;
  user: Pick<UserRecord, 'id' | 'email' | 'firstName' | 'lastName' | 'role'>;
  department: Pick<DepartmentRecord, 'id' | 'code' | 'name'>;
}

export interface CreateInstructorPayload {
  userId: string;
  employeeId: string;
  departmentId: string;
  title?: string;
  officeLocation?: string;
}

// --- Programs ---
export type DegreeType = 'DIPLOMA' | 'BACHELOR' | 'MASTER' | 'DOCTORATE' | 'CERTIFICATE';

export interface ProgramRecord {
  id: string;
  code: string;
  name: string;
  degreeType: DegreeType;
  durationYears: string; // Prisma Decimal serialised as string
  totalCreditsRequired: number;
  status: string;
  departmentId: string;
  department: Pick<DepartmentRecord, 'id' | 'code' | 'name' | 'faculty'>;
}

export interface ProgramDetail extends ProgramRecord {
  students: StudentProfile[];
}

export interface CreateProgramPayload {
  departmentId: string;
  code: string;
  name: string;
  degreeType?: DegreeType;
  durationYears: number;
  totalCreditsRequired: number;
}

// --- Students ---
export interface StudentProfile {
  id: string;
  studentIdNumber: string;
  batch: number;
  status: string;
  userId: string;
  programId: string;
  admissionSemesterId: string | null;
  user: Pick<UserRecord, 'id' | 'email' | 'firstName' | 'lastName' | 'role' | 'status'>;
  program: Pick<ProgramRecord, 'id' | 'code' | 'name'> & {
    department: Pick<DepartmentRecord, 'id' | 'code' | 'name'>;
  };
}

export interface CreateStudentPayload {
  userId: string;
  studentIdNumber: string;
  programId: string;
  batch: number;
  admissionSemesterId?: string;
}

// --- Academic calendar ---
export interface AcademicYearRecord {
  id: string;
  yearCode: string;
  title: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  semesters: SemesterRecord[];
}

export interface SemesterRecord {
  id: string;
  academicYearId: string;
  code: string;
  name: string;
  termType: string;
  startDate: string;
  endDate: string;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  isCurrent: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  academicYear: Pick<AcademicYearRecord, 'id' | 'yearCode' | 'title'> | null;
}

export interface CreateAcademicYearPayload {
  yearCode: string;
  title: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
  status?: string;
}

export interface CreateSemesterPayload {
  academicYearId: string;
  code: string;
  name: string;
  termType: string;
  startDate: string;
  endDate: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  isCurrent?: boolean;
  status?: string;
}

// --- Infrastructure: Buildings and Rooms ---
export interface BuildingRecord {
  id: string;
  code: string;
  name: string;
  campusName: string;
  totalFloors?: number;
  createdAt: string;
  updatedAt: string;
  rooms: RoomRecord[];
}

export interface BuildingDetail extends BuildingRecord {
  roomCount: number;
}

export interface CreateBuildingPayload {
  code: string;
  name: string;
  campusName: string;
  totalFloors?: number;
}

export type RoomType = 'LECTURE_HALL' | 'LABORATORY' | 'COMPUTER_LAB' | 'SEMINAR_ROOM' | 'OFFICE';

export interface RoomRecord {
  id: string;
  code: string;
  roomNumber: string;
  name?: string;
  type: RoomType;
  capacity: number;
  floorLevel: number;
  isAccessible: boolean;
  hasProjector: boolean;
  hasComputers: boolean;
  computerCount: number;
  hasLabEquipment: boolean;
  buildingId: string;
  createdAt: string;
  updatedAt: string;
  building: Pick<BuildingRecord, 'id' | 'code' | 'name'>;
}

export interface CreateRoomPayload {
  buildingId: string;
  code: string;
  roomNumber: string;
  name?: string;
  type?: RoomType;
  capacity: number;
  floorLevel?: number;
  isAccessible?: boolean;
  hasProjector?: boolean;
  hasComputers?: boolean;
  computerCount?: number;
  hasLabEquipment?: boolean;
}

// --- Course Offerings ---
export type DeliveryMode = 'REGULAR' | 'EXTENSION' | 'DISTANCE';
export type CourseOfferingStatus = 'PLANNED' | 'OPEN' | 'CLOSED' | 'CANCELLED' | 'COMPLETED';

export interface CourseOfferingRecord {
  id: string;
  courseId: string;
  semesterId: string;
  instructorId: string | null;
  roomId: string | null;
  sectionCode: string;
  deliveryMode: DeliveryMode;
  maxCapacity: number;
  currentEnrollment: number;
  status: CourseOfferingStatus;
  syllabusUrl: string | null;
  createdAt: string;
  updatedAt: string;
  course: Pick<CourseRecord, 'id' | 'code' | 'title' | 'creditHours'>;
  semester: Pick<SemesterRecord, 'id' | 'code' | 'name'>;
  instructor: (InstructorRecord & { user: Pick<UserRecord, 'id' | 'email' | 'firstName' | 'lastName'> }) | null;
  room: (Pick<RoomRecord, 'id' | 'code' | 'roomNumber' | 'capacity'> & { building: Pick<BuildingRecord, 'id' | 'code' | 'name'> }) | null;
}

export interface CourseOfferingDetail extends CourseOfferingRecord {
  course: CourseRecord & {
    prerequisiteRequirements: Array<{
      id: string;
      prerequisiteCourse: Pick<CourseRecord, 'id' | 'code' | 'title'>;
    }>;
  };
}

export interface CreateCourseOfferingPayload {
  courseId: string;
  semesterId: string;
  instructorId?: string;
  roomId?: string;
  sectionCode: string;
  deliveryMode?: DeliveryMode;
  maxCapacity: number;
  status?: CourseOfferingStatus;
  syllabusUrl?: string;
}

// --- Courses (if not already defined) ---
export interface CourseRecord {
  id: string;
  code: string;
  title: string;
  description?: string;
  creditHours: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}
// --- Enrollment Domain ---
export type EnrollmentTypeEnum = 'CREDIT' | 'AUDIT';
export type EnrollmentStatusEnum = 'ENROLLED' | 'DROPPED' | 'WITHDRAWN' | 'COMPLETED' | 'FAILED';

export interface EnrollmentRecord {
  id: string;
  studentId: string;
  courseOfferingId: string;
  enrollmentType: EnrollmentTypeEnum;
  status: EnrollmentStatusEnum;
  attemptNumber: number;
  enrolledAt: string;
  droppedAt: string | null;
  withdrawnAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  student: StudentProfile & {
    user: Pick<UserRecord, 'id' | 'email' | 'firstName' | 'lastName' | 'role'>;
    program: Pick<ProgramRecord, 'id' | 'code' | 'name'>;
  };
  courseOffering: CourseOfferingRecord & {
    course: Pick<CourseRecord, 'id' | 'code' | 'title' | 'creditHours'>;
    semester: Pick<SemesterRecord, 'id' | 'code' | 'name'>;
  };
}

export interface EnrollmentDetail extends EnrollmentRecord {
  student: StudentProfile & {
    user: Pick<UserRecord, 'id' | 'email' | 'firstName' | 'lastName' | 'role'>;
    program: Pick<ProgramRecord, 'id' | 'code' | 'name'> & {
      department: Pick<DepartmentRecord, 'id' | 'code' | 'name'>;
    };
  };
  courseOffering: CourseOfferingRecord & {
    course: CourseRecord & {
      prerequisiteRequirements: Array<{
        id: string;
        prerequisiteCourse: Pick<CourseRecord, 'id' | 'code' | 'title'>;
      }>;
    };
    semester: Pick<SemesterRecord, 'id' | 'code' | 'name'>;
    instructor: (InstructorRecord & { user: Pick<UserRecord, 'id' | 'email' | 'firstName' | 'lastName'> }) | null;
    room: (Pick<RoomRecord, 'id' | 'code' | 'roomNumber' | 'capacity'> & { building: Pick<BuildingRecord, 'id' | 'code' | 'name'> }) | null;
  };
}

// ---------------------------------------------------------------------------
// Timetable domain — matching backend Prisma schema and service returns exactly
// ---------------------------------------------------------------------------

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export type RecurrencePattern = 'WEEKLY' | 'BIWEEKLY_EVEN' | 'BIWEEKLY_ODD';

export type SessionType = 'LECTURE' | 'LABORATORY' | 'TUTORIAL' | 'SEMINAR';

export type SlotStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

export interface CreateTimetableSlotPayload {
  courseOfferingId: string;
  roomId: string;
  instructorId?: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  startWeek?: number;
  endWeek?: number;
  recurrencePattern?: RecurrencePattern;
  sessionType?: SessionType;
}

export interface TimetableSlotRecord {
  id: string;
  courseOfferingId: string;
  roomId: string;
  instructorId: string | null;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  startWeek: number;
  endWeek: number;
  recurrencePattern: RecurrencePattern;
  sessionType: SessionType;
  status: SlotStatus;
  createdAt: string;
  updatedAt: string;
  courseOffering: {
    course: CourseRecord;
  };
  room: {
    building: Pick<BuildingRecord, 'id' | 'code' | 'name'>;
  };
  instructor?: {
    user: Pick<UserRecord, 'id' | 'email' | 'firstName' | 'lastName'>;
  };
}

export interface TimetableSlotDetail extends TimetableSlotRecord {
  courseOffering: {
    course: CourseRecord;
    semester: Pick<SemesterRecord, 'id' | 'code' | 'name'>;
  };
}

export interface CreateEnrollmentPayload {
  studentId: string;
  courseOfferingId: string;
  enrollmentType?: EnrollmentTypeEnum;
}

export interface UpdateEnrollmentStatusPayload {
  status: EnrollmentStatusEnum;
}