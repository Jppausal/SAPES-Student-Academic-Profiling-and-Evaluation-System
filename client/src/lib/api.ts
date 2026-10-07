const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export type ServerStatus = 'checking' | 'online' | 'offline';

export interface ApiUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  studentNumber: string;
  employeeId: string;
  department: string;
  role: 'student' | 'faculty' | 'admin';
  accountStatus: 'active' | 'inactive' | 'suspended';
  createdAt?: string;
}

export interface SessionUser {
  id: string;
  username: string;
  role: ApiUser['role'];
  firstName: string;
  lastName: string;
  email: string;
  studentNumber?: string;
  employeeId?: string;
  department?: string;
}

export interface ApiAuditLog {
  userId: { username: string; role: 'student' | 'faculty' | 'admin' } | null;
  action: string;
  targetType: string;
  targetId: string | null;
  timestamp: string;
  details: Record<string, unknown>;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('sapes_jwt');
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }
  return payload;
}

export async function loginRequest(username: string, password: string) {
  return request<{
    success: true;
    token: string;
    user: SessionUser;
  }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function googleLoginRequest(credential: string) {
  return request<{
    success: true;
    token: string;
    user: SessionUser;
  }>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
}

export async function logoutRequest() {
  return request<{ success: true; message: string }>('/api/auth/logout', {
    method: 'POST',
  });
}

export async function requestPasswordReset(username: string) {
  return request<{ success: true; message: string }>('/api/auth/password-reset/request', {
    method: 'POST', body: JSON.stringify({ username })
  });
}
export async function fetchUserSettings() { const response = await request<{ success: true; data: { notificationPreferences: { profileAndAcademicUpdates: boolean } } }>('/api/auth/settings'); return response.data; }
export async function saveUserSettings(profileAndAcademicUpdates: boolean) { return request('/api/auth/settings', { method: 'PUT', body: JSON.stringify({ notificationPreferences: { profileAndAcademicUpdates } }) }); }

export async function verifyPasswordReset(username: string, code: string) { return request<{ success: true; resetAuthorization: string }>('/api/auth/password-reset/verify', { method: 'POST', body: JSON.stringify({ username, code }) }); }
export async function confirmPasswordReset(resetAuthorization: string, newPassword: string) {
  return request<{ success: true; message: string }>('/api/auth/password-reset/confirm', {
    method: 'POST', body: JSON.stringify({ resetAuthorization, newPassword })
  });
}

export async function fetchUsers() {
  const response = await request<{ success: true; data: { users: ApiUser[] } }>('/api/users?limit=100');
  return response.data.users;
}

export async function createUser(payload: {
  username: string;
  password: string;
  role: ApiUser['role'];
  firstName?: string;
  lastName?: string;
  email?: string;
  studentNumber?: string;
  employeeId?: string;
  department?: string;
}) {
  const response = await request<{ success: true; data: { user: ApiUser } }>('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data.user;
}

export async function updateUserStatus(userId: string, accountStatus: ApiUser['accountStatus']) {
  const response = await request<{ success: true; data: { user: ApiUser } }>(
    `/api/users/${encodeURIComponent(userId)}/status`,
    {
      method: 'PUT',
      body: JSON.stringify({ accountStatus }),
    }
  );
  return response.data.user;
}

export async function updateUser(userId: string, payload: {
  username?: string;
  password?: string;
  role?: ApiUser['role'];
  accountStatus?: ApiUser['accountStatus'];
  firstName?: string;
  lastName?: string;
  email?: string;
  studentNumber?: string;
  employeeId?: string;
  department?: string;
}) {
  const response = await request<{ success: true; data: { user: ApiUser } }>(
    `/api/users/${encodeURIComponent(userId)}`,
    { method: 'PUT', body: JSON.stringify(payload) }
  );
  return response.data.user;
}

export async function fetchAuditLogs() {
  const response = await request<{
    success: true;
    data: { auditLogs: ApiAuditLog[] };
  }>('/api/audit-logs?limit=20');
  return response.data.auditLogs;
}

export interface RolePermissionConfig {
  role: 'student' | 'faculty' | 'admin';
  permissions: string[];
}

export async function fetchRolePermissions() {
  const response = await request<{
    success: true;
    data: { availablePermissions: string[]; roles: RolePermissionConfig[] };
  }>('/api/permissions');
  return response.data;
}

export async function updateRolePermissions(role: RolePermissionConfig['role'], permissions: string[]) {
  const response = await request<{ success: true; data: RolePermissionConfig }>(
    `/api/permissions/${role}`,
    { method: 'PUT', body: JSON.stringify({ permissions }) }
  );
  return response.data;
}

export interface AcademicSubject {
  subjectCode: string;
  subjectName: string;
  units: number;
  grade: number;
  isMajor: boolean;
  status: string;
}

export async function fetchCurrentSession() {
  return request<{ success: true; user: SessionUser }>('/api/auth/session');
}

export interface AcademicTermRecord {
  academicYear: string;
  semester: string;
  subjects: AcademicSubject[];
  majorSubjectGwa?: number;
}

export interface StudentReport {
  student: {
    institutionId: string;
    personalInformation?: {
      firstName?: string;
      lastName?: string;
    };
    academicStatus?: {
      currentStatus?: string;
      statusRemarks?: string;
    };
    schedulingRestrictions?: Array<{ dayOfWeek: string; startTime: string; endTime: string }>;
  };
  academicRecords: AcademicTermRecord[];
  majorSubjectGwa: number;
  facultyEvaluation?: {
    evaluationStatus: string;
    reasons: string[];
    remarks?: string;
    evaluatedAt?: string;
  } | null;
  statusHistory: Array<{
    status: string;
    reason?: string;
    effectiveDate: string;
    remarks?: string;
  }>;
}

export async function fetchStudentReport(institutionId: string) {
  const response = await request<{ success: true; data: StudentReport }>(
    `/api/students/${encodeURIComponent(institutionId)}/report`
  );
  return response.data;
}

export interface StudentSuggestion {
  institutionId: string;
  username: string;
  firstName: string;
  lastName: string;
}

export async function fetchStudentSuggestions(query: string) {
  const params = new URLSearchParams({ q: query });
  const response = await request<{ success: true; data: { students: StudentSuggestion[] } }>(
    `/api/students/search?${params.toString()}`
  );
  return response.data.students;
}

export interface CourseEnrollmentSummary {
  programs: Array<{ program: string; count: number }>;
  totalActiveStudents: number;
  pendingEnrollmentCount: number;
  pendingEnrollmentStudents: Array<{
    institutionId: string;
    name: string;
    program: string;
    yearLevel: number | null;
    enrollmentStatus: 'not_enrolled' | 'processing';
  }>;
  unassignedCount: number;
}

export type AssessmentCategory = 'quiz' | 'lab' | 'exam' | 'other';
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

export interface CourseEvaluationProgress {
  _id?: string;
  academicYear: string;
  semester: string;
  assessments: Array<{
    _id?: string;
    title: string;
    category: AssessmentCategory;
    score: number;
    possiblePoints: number;
    submitted: boolean;
    dueDate?: string;
  }>;
  attendanceLogs: Array<{
    _id?: string;
    date: string;
    status: AttendanceStatus;
    notes?: string;
    excuseLetter?: string;
  }>;
  rubricScores: Array<{
    _id?: string;
    competency: string;
    rating: number;
    maxRating: number;
    notes?: string;
  }>;
  facultyRemarks: Array<{ _id?: string; text: string; createdAt?: string }>;
  internalNotes: string;
}

export interface CourseMetrics {
  attendanceRate: number | null;
  classPercentile: number | null;
  runningGrade: number | null;
  submissionRate: number | null;
}

export interface FacultyRosterStudent {
  institutionId: string;
  username: string;
  firstName: string;
  lastName: string;
  program: string;
  yearLevel: number | null;
  section: string;
  enrollmentStatus: string;
  currentStatus: string;
  isOnProbation: boolean;
  metrics: CourseMetrics;
}

export interface FacultyStudentWorkspace {
  student: {
    institutionId: string;
    username: string;
    personalInformation: {
      firstName?: string;
      middleName?: string;
      lastName?: string;
      email?: string;
      sex?: string;
    };
    classification: {
      program?: string;
      studentType?: string;
      isIP?: boolean;
      isPWD?: boolean;
      isShifter?: boolean;
      isTransferee?: boolean;
    };
    academicStatus: { currentStatus: string; isOnProbation: boolean };
    yearLevel: number | null;
    section: string;
    enrollmentStatus: string;
  };
  academicRecords: AcademicTermRecord[];
  majorSubjectGwa: number;
  courseEvaluation: CourseEvaluationProgress;
  metrics: CourseMetrics;
  peerCount: number;
}

export async function fetchFacultyEvaluationRoster(program: string) {
  const params = new URLSearchParams({ program });
  const response = await request<{ success: true; data: { students: FacultyRosterStudent[] } }>(
    `/api/faculty-evaluations/roster?${params.toString()}`
  );
  return response.data.students;
}

export async function fetchFacultyStudentWorkspace(institutionId: string) {
  const response = await request<{ success: true; data: FacultyStudentWorkspace }>(
    `/api/faculty-evaluations/student/${encodeURIComponent(institutionId)}`
  );
  return response.data;
}

export async function saveFacultyCourseEvaluation(institutionId: string, progress: CourseEvaluationProgress) {
  const response = await request<{ success: true; data: { courseEvaluation: CourseEvaluationProgress } }>(
    `/api/faculty-evaluations/student/${encodeURIComponent(institutionId)}/progress`,
    { method: 'PUT', body: JSON.stringify(progress) }
  );
  return response.data.courseEvaluation;
}

export async function fetchCourseEnrollmentSummary() {
  const response = await request<{ success: true; data: CourseEnrollmentSummary }>(
    '/api/students/courses/enrollment-summary'
  );
  return response.data;
}

export interface InstitutionalStudentSummary {
  institutionId: string;
  personalInformation: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    suffix?: string;
  };
  classification: {
    studentType?: string;
    isIP?: boolean;
    isPWD?: boolean;
    isShifter?: boolean;
    isTransferee?: boolean;
  };
  religiousInformation: { religion?: string };
  academicStatus: { currentStatus?: string; isOnProbation?: boolean };
  academicRecordCount: number;
  subjectCount: number;
  majorSubjectGwa: number;
  facultyEvaluation: {
    evaluationStatus: string;
    evaluatedAt?: string;
  } | null;
}

export async function fetchInstitutionalStudentSummary(page = 1, limit = 25) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  const response = await request<{
    success: true;
    data: {
      students: InstitutionalStudentSummary[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
      statistics: { ip: number; pwd: number; probation: number; evaluated: number };
    };
    schedulingRestrictions?: Array<{ dayOfWeek: string; startTime: string; endTime: string }>;
  }>(`/api/students/reports/summary?${query.toString()}`);
  return response.data;
}

export async function saveAcademicRecord(
  institutionId: string,
  record: AcademicTermRecord
) {
  const response = await request<{ success: true; data: AcademicTermRecord }>(
    `/api/students/${encodeURIComponent(institutionId)}/academic-records`,
    { method: 'PUT', body: JSON.stringify(record) }
  );
  return response.data;
}

export interface StudentIdentity {
  institutionId: string;
  personalInformation?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    birthDate?: string;
    birthPlace?: string;
    sex?: string;
    civilStatus?: string;
    nationality?: string;
    citizenship?: string;
    height?: string;
    weight?: string;
    bloodType?: string;
    dualCitizenship?: string;
    minority?: string;
    isForeigner?: boolean;
  };
  enrollmentInformation?: Record<string, string>;
  contactInformation?: Record<string, string>;
  addresses?: { presentAddress?: Record<string, string>; homeAddress?: Record<string, string> };
  educationalBackground?: Record<string, string>;
  healthInformation?: { hasRelevantHealthConcern?: boolean; conditions?: string[]; otherCondition?: string; allergyDetails?: string; conditionDescription?: string; accommodationRequired?: boolean; accommodationNotes?: string; emergencyContactName?: string; emergencyContactNumber?: string; lastUpdated?: string };
  classification?: {
    program?: string;
    studentType?: string;
    isIP?: boolean;
    isPWD?: boolean;
    isShifter?: boolean;
    isTransferee?: boolean;
    indigenousGroup?: string;
  };
  religiousInformation?: { religion?: string; shareSpiritualSchedule?: boolean; spiritualActivities?: Array<{ dayOfWeek: string; startTime: string; endTime: string }> };
  academicStatus?: {
    currentStatus?: string;
    isOnProbation?: boolean;
    probationReason?: string;
    statusRemarks?: string;
    effectiveDate?: string;
  };
}

export async function fetchMyStudentIdentity() {
  const response = await request<{ success: true; data: StudentIdentity }>('/api/me/student');
  return response.data;
}

export type StudentProfileUpdate = {
  personalInformation?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    suffix?: string;
    birthDate?: string;
    birthPlace?: string;
    sex?: string;
    civilStatus?: string;
    nationality?: string;
    citizenship?: string;
    height?: string;
    weight?: string;
    bloodType?: string;
    dualCitizenship?: string;
    minority?: string;
    isForeigner?: boolean;
  };
  enrollmentInformation?: Record<string, string>;
  contactInformation?: Record<string, string>;
  addresses?: { presentAddress?: Record<string, string>; homeAddress?: Record<string, string> };
  educationalBackground?: Record<string, string>;
  healthInformation?: { hasRelevantHealthConcern?: boolean; conditions?: string[]; otherCondition?: string; allergyDetails?: string; conditionDescription?: string; accommodationRequired?: boolean; accommodationNotes?: string; emergencyContactName?: string; emergencyContactNumber?: string; lastUpdated?: string };
  classification?: {
    program?: string;
    studentType?: string;
    isIP?: boolean;
    isPWD?: boolean;
    isShifter?: boolean;
    isTransferee?: boolean;
    indigenousGroup?: string;
  };
  religiousInformation?: { religion?: string; shareSpiritualSchedule?: boolean; spiritualActivities?: Array<{ dayOfWeek: string; startTime: string; endTime: string }> };
};

export async function updateMyStudentProfile(payload: StudentProfileUpdate) {
  const response = await request<{ success: true; data: StudentIdentity }>(
    '/api/me/student/profile',
    { method: 'PUT', body: JSON.stringify(payload) }
  );
  return response.data;
}

export async function fetchMyStudentReport() {
  const response = await request<{ success: true; data: StudentReport }>(
    '/api/me/student/report'
  );
  return response.data;
}

export async function saveStudentEvaluation(
  institutionId: string,
  payload: { evaluationStatus: string; reasons: string[]; remarks: string }
) {
  return request(`/api/students/${encodeURIComponent(institutionId)}/evaluation`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateStudentStatus(
  institutionId: string,
  payload: { status: string; reason?: string; remarks?: string }
) {
  return request(`/api/students/${encodeURIComponent(institutionId)}/status`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function checkStudentScheduleConflicts(institutionId: string, meetings: Array<{ dayOfWeek: string; startTime: string; endTime: string }>) {
  const response = await request<{ success: true; data: { eligible: boolean; conflicts: Array<{ meeting: { dayOfWeek: string; startTime: string; endTime: string } }> } }>(`/api/students/${encodeURIComponent(institutionId)}/schedule-conflicts`, { method: 'POST', body: JSON.stringify({ meetings }) });
  return response.data;
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/health`, {
      headers: { Accept: 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
}
