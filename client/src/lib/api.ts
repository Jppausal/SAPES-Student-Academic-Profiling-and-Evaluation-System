const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export type ServerStatus = 'checking' | 'online' | 'offline';

export interface ApiUser {
  id: string;
  username: string;
  role: 'student' | 'faculty' | 'admin';
  accountStatus: 'active' | 'inactive' | 'suspended';
  createdAt?: string;
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
    user: { id: string; username: string; role: ApiUser['role'] };
  }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
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

export async function fetchAuditLogs() {
  const response = await request<{
    success: true;
    data: { auditLogs: ApiAuditLog[] };
  }>('/api/audit-logs?limit=20');
  return response.data.auditLogs;
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
  };
  academicRecords: Array<{
    academicYear: string;
    semester: string;
    subjects: Array<{
      subjectCode: string;
      subjectName: string;
      units: number;
      grade: number;
      isMajor: boolean;
      status: string;
    }>;
  }>;
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

export interface StudentIdentity {
  institutionId: string;
  personalInformation?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
  };
  classification?: {
    studentType?: string;
    isIP?: boolean;
    isPWD?: boolean;
    indigenousGroup?: string;
  };
  religiousInformation?: { religion?: string };
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
