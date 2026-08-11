import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type {
  ApiErrorShape,
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  UserSummary,
  SystemOverview,
  StudentDashboard,
  InstructorDashboard,
  UserRecord,
  UserDetail,
  CreateUserPayload,
  FacultyRecord,
  CreateFacultyPayload,
  DepartmentRecord,
  DepartmentDetail,
  CreateDepartmentPayload,
  InstructorRecord,
  CreateInstructorPayload,
  ProgramRecord,
  ProgramDetail,
  CreateProgramPayload,
  StudentProfile,
  CreateStudentPayload,
  AcademicYearRecord,
  SemesterRecord,
  CreateAcademicYearPayload,
  CreateSemesterPayload,
  BuildingRecord,
  BuildingDetail,
  CreateBuildingPayload,
  RoomRecord,
  CreateRoomPayload,
  CourseRecord,
  CourseOfferingRecord,
  CourseOfferingDetail,
  CreateCourseOfferingPayload,
  EnrollmentRecord,
  EnrollmentDetail,
  CreateEnrollmentPayload,
  UpdateEnrollmentStatusPayload,
} from '@/types/api';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Bearer token from localStorage on every request
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('accessToken');
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return config;
});

// Normalise all errors into ApiErrorShape
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status ?? 500;
    const data = error.response?.data as { message?: string | string[]; error?: string } | undefined;

    // NestJS ValidationPipe returns message as string[] for 400 errors
    const rawMessage = data?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage[0]
      : (rawMessage ?? data?.error ?? error.message ?? 'Request failed');

    // On 401, evict stale token so interceptor doesn't send it again
    if (status === 401 && typeof window !== 'undefined') {
      window.localStorage.removeItem('accessToken');
    }

    const apiError: ApiErrorShape = { message, status, code: error.code };
    return Promise.reject(apiError);
  },
);

// ---------------------------------------------------------------------------
// Auth endpoints — matching backend contracts exactly
// POST /auth/login    → LoginPayload → AuthResponse (200)
// POST /auth/register → RegisterPayload → AuthResponse (201)
// GET  /auth/me       → UserSummary (JWT-protected)
// ---------------------------------------------------------------------------
export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<AuthResponse>('/auth/login', payload),

  register: (payload: RegisterPayload) =>
    apiClient.post<AuthResponse>('/auth/register', payload),

  me: () => apiClient.get<UserSummary>('/auth/me'),
};

// ---------------------------------------------------------------------------
// Dashboard endpoints — matching backend DashboardController exactly
// GET /dashboard/system           → SystemOverview  (ADMIN, REGISTRAR, FACULTY_DEAN)
// GET /dashboard/student/:id      → StudentDashboard (all roles)
// GET /dashboard/instructor/:id   → InstructorDashboard (non-STUDENT roles)
// ---------------------------------------------------------------------------
export const dashboardApi = {
  system: () =>
    apiClient.get<SystemOverview>('/dashboard/system'),

  student: (studentId: string) =>
    apiClient.get<StudentDashboard>(`/dashboard/student/${studentId}`),

  instructor: (instructorId: string) =>
    apiClient.get<InstructorDashboard>(`/dashboard/instructor/${instructorId}`),
};

// ---------------------------------------------------------------------------
// Core Academic Structure endpoints
// ---------------------------------------------------------------------------
export const usersApi = {
  list: () => apiClient.get<UserRecord[]>('/users'),
  get: (id: string) => apiClient.get<UserDetail>(`/users/${id}`),
  create: (payload: CreateUserPayload) => apiClient.post<UserRecord>('/users', payload),
};

export const facultiesApi = {
  list: () => apiClient.get<FacultyRecord[]>('/academic-structure/faculties'),
  create: (payload: CreateFacultyPayload) =>
    apiClient.post<FacultyRecord>('/academic-structure/faculties', payload),
};

export const departmentsApi = {
  list: () => apiClient.get<DepartmentRecord[]>('/academic-structure/departments'),
  get: (id: string) => apiClient.get<DepartmentDetail>(`/academic-structure/departments/${id}`),
  create: (payload: CreateDepartmentPayload) =>
    apiClient.post<DepartmentRecord>('/academic-structure/departments', payload),
};

export const instructorsApi = {
  list: () => apiClient.get<InstructorRecord[]>('/academic-structure/instructors'),
  create: (payload: CreateInstructorPayload) =>
    apiClient.post<InstructorRecord>('/academic-structure/instructors', payload),
};

export const programsApi = {
  list: () => apiClient.get<ProgramRecord[]>('/programs'),
  get: (id: string) => apiClient.get<ProgramDetail>(`/programs/${id}`),
  create: (payload: CreateProgramPayload) => apiClient.post<ProgramRecord>('/programs', payload),
};

export const coursesApi = {
  list: () => apiClient.get<CourseRecord[]>('/courses'),
  get: (id: string) => apiClient.get<CourseRecord>(`/courses/${id}`),
};

export const studentsApi = {
  list: () => apiClient.get<StudentProfile[]>('/programs/students'),
  get: (id: string) => apiClient.get<StudentProfile>(`/programs/students/${id}`),
  create: (payload: CreateStudentPayload) =>
    apiClient.post<StudentProfile>('/programs/students', payload),
};

export const academicCalendarApi = {
  listYears: () => apiClient.get<AcademicYearRecord[]>('/academic-calendar/years'),
  createYear: (payload: CreateAcademicYearPayload) =>
    apiClient.post<AcademicYearRecord>('/academic-calendar/years', payload),
  activateYear: (id: string) => apiClient.patch<AcademicYearRecord>(`/academic-calendar/years/${id}/activate`),
  listSemesters: () => apiClient.get<SemesterRecord[]>('/academic-calendar/semesters'),
  createSemester: (payload: CreateSemesterPayload) =>
    apiClient.post<SemesterRecord>('/academic-calendar/semesters', payload),
  activateSemester: (id: string) => apiClient.patch<SemesterRecord>(`/academic-calendar/semesters/${id}/activate`),
};

// ---------------------------------------------------------------------------
// Infrastructure endpoints — Buildings and Rooms
// POST /infrastructure/buildings     → CreateBuildingPayload → BuildingRecord
// GET  /infrastructure/buildings     → BuildingRecord[]
// GET  /infrastructure/buildings/:id → BuildingDetail
// POST /infrastructure/rooms         → CreateRoomPayload → RoomRecord
// GET  /infrastructure/rooms         → RoomRecord[]
// GET  /infrastructure/rooms/:id     → RoomRecord
// ---------------------------------------------------------------------------
export const buildingsApi = {
  list: () => apiClient.get<BuildingRecord[]>('/infrastructure/buildings'),
  get: (id: string) => apiClient.get<BuildingDetail>(`/infrastructure/buildings/${id}`),
  create: (payload: CreateBuildingPayload) =>
    apiClient.post<BuildingRecord>('/infrastructure/buildings', payload),
};

export const roomsApi = {
  list: () => apiClient.get<RoomRecord[]>('/infrastructure/rooms'),
  get: (id: string) => apiClient.get<RoomRecord>(`/infrastructure/rooms/${id}`),
  create: (payload: CreateRoomPayload) =>
    apiClient.post<RoomRecord>('/infrastructure/rooms', payload),
};

// ---------------------------------------------------------------------------
// Course Offerings endpoints
// POST /course-offerings     → CreateCourseOfferingPayload → CourseOfferingRecord
// GET  /course-offerings     → CourseOfferingRecord[]
// GET  /course-offerings/:id → CourseOfferingDetail
// ---------------------------------------------------------------------------
export const courseOfferingsApi = {
  list: () => apiClient.get<CourseOfferingRecord[]>('/course-offerings'),
  get: (id: string) => apiClient.get<CourseOfferingDetail>(`/course-offerings/${id}`),
  create: (payload: CreateCourseOfferingPayload) =>
    apiClient.post<CourseOfferingRecord>('/course-offerings', payload),
};

export default apiClient;

export const enrollmentsApi = {
  list: () => apiClient.get<EnrollmentRecord[]>('/enrollments'),
  get: (id: string) => apiClient.get<EnrollmentDetail>(`/enrollments/${id}`),
  create: (payload: CreateEnrollmentPayload) =>
    apiClient.post<EnrollmentRecord>('/enrollments', payload),
  updateStatus: (id: string, payload: UpdateEnrollmentStatusPayload) =>
    apiClient.patch<EnrollmentRecord>(`/enrollments/${id}/status`, payload),
};