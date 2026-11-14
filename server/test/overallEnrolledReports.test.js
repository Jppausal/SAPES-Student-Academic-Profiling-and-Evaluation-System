const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');

const AdminUser = require('../models/AdminUser');
const FacultyUser = require('../models/FacultyUser');
const Student = require('../models/Student');
const SessionToken = require('../models/SessionToken');
const RolePermission = require('../models/RolePermission');
const FacultyEvaluation = require('../models/FacultyEvaluation');
const AcademicRecord = require('../models/AcademicRecord');
const AuditLog = require('../models/AuditLog');

const query = (value) => {
  const result = Promise.resolve(value);
  for (const method of ['select', 'sort', 'populate', 'skip', 'limit']) {
    result[method] = () => result;
  }
  result.lean = async () => value;
  return result;
};

async function setupServer(t) {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'overall-enrolled-reports-test-secret';
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const app = express();
  app.use(express.json());
  app.use('/api/students', require('../routes/studentRoutes'));
  app.use('/api/permissions', require('../controllers/permissionController'));

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const request = (path, options = {}, role = 'admin', customPayload = null) => {
    const headers = { ...options.headers };
    if (role) {
      const payload = customPayload || {
        userId:
          role === 'admin'
            ? '507f1f77bcf86cd799439099'
            : role === 'faculty'
            ? '507f1f77bcf86cd799439088'
            : '507f1f77bcf86cd799439077',
        role,
        jti: 'test-session-id'
      };
      headers.Authorization = `Bearer ${jwt.sign(payload, process.env.JWT_SECRET)}`;
    }
    return fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      ...options,
      headers
    });
  };

  return { request };
}

const mockStudents = [
  {
    _id: '507f1f77bcf86cd799439001',
    institutionId: '2023-0001',
    personalInformation: { firstName: 'Juan', lastName: 'Dela Cruz' },
    classification: { program: 'Bachelor of Information Technology', isIP: true, isPWD: false },
    enrollmentInformation: { course: 'Bachelor of Information Technology', department: 'IT', yearLevel: '3' },
    yearLevel: 3,
    section: '3A',
    enrollmentStatus: 'enrolled',
    religiousInformation: { religion: 'Roman Catholic' },
    academicStatus: { currentStatus: 'Regular', isOnProbation: false },
    createdAt: new Date('2026-01-15T08:00:00Z')
  },
  {
    _id: '507f1f77bcf86cd799439002',
    institutionId: '2023-0002',
    personalInformation: { firstName: 'Maria', lastName: 'Santos' },
    classification: { program: 'Entertainment and Multimedia Computing', isIP: false, isPWD: true },
    enrollmentInformation: { course: 'Entertainment and Multimedia Computing', department: 'EMC', yearLevel: '2' },
    yearLevel: 2,
    section: '2B',
    enrollmentStatus: 'enrolled',
    religiousInformation: { religion: 'Seventh-day Adventist' },
    academicStatus: { currentStatus: 'Probation', isOnProbation: true },
    createdAt: new Date('2026-02-10T09:00:00Z')
  },
  {
    _id: '507f1f77bcf86cd799439003',
    institutionId: '2023-0003',
    personalInformation: { firstName: 'Pedro', lastName: 'Penduko' },
    classification: { program: 'Bachelor of Information Technology', isIP: false, isPWD: false },
    enrollmentInformation: { course: 'Bachelor of Information Technology', department: 'IT', yearLevel: '1' },
    yearLevel: 1,
    section: '1C',
    enrollmentStatus: 'not_enrolled',
    religiousInformation: { religion: 'Islam' },
    academicStatus: { currentStatus: 'Regular', isOnProbation: false },
    createdAt: new Date('2025-11-20T10:00:00Z')
  }
];

const mockRecords = [
  {
    _id: 'record-1',
    studentId: '507f1f77bcf86cd799439001',
    academicYear: '2025-2026',
    semester: '1st Semester',
    subjects: [
      { subjectCode: 'IT 301', subjectName: 'Systems Integration', units: 3, grade: 1.5, isMajor: true, status: 'Passed' },
      { subjectCode: 'GE 101', subjectName: 'Understanding the Self', units: 3, grade: 1.75, isMajor: false, status: 'Passed' }
    ]
  },
  {
    _id: 'record-2',
    studentId: '507f1f77bcf86cd799439002',
    academicYear: '2025-2026',
    semester: '1st Semester',
    subjects: [
      { subjectCode: 'EMC 201', subjectName: '2D Animation', units: 3, grade: 2.0, isMajor: true, status: 'Passed' }
    ]
  }
];

const mockEvaluation = {
  _id: 'eval-1',
  studentId: '507f1f77bcf86cd799439001',
  facultyId: { username: 'prof.smith', role: 'faculty' },
  evaluationStatus: 'eligible',
  reasons: ['Prerequisites cleared'],
  remarks: 'Eligible for regular academic loads.',
  evaluatedAt: new Date('2026-03-01T10:00:00Z')
};

let capturedAuditLogs = [];

function setupCommonMocks(t) {
  capturedAuditLogs = [];
  t.mock.method(AdminUser, 'findById', (id) => {
    if (id === 'inactive-admin-id') {
      return query({ _id: id, role: 'admin', accountStatus: 'inactive' });
    }
    if (id === '507f1f77bcf86cd799439099' || id === 'admin') {
      return query({ _id: '507f1f77bcf86cd799439099', role: 'admin', accountStatus: 'active' });
    }
    return query(null);
  });
  t.mock.method(FacultyUser, 'findById', (id) =>
    query(
      id === '507f1f77bcf86cd799439088' || id === 'faculty'
        ? { _id: '507f1f77bcf86cd799439088', role: 'faculty', accountStatus: 'active' }
        : null
    )
  );
  t.mock.method(Student, 'findById', (id) =>
    query(
      id === '507f1f77bcf86cd799439077' || id === 'student'
        ? { _id: '507f1f77bcf86cd799439077', role: 'student', accountStatus: 'active' }
        : null
    )
  );
  t.mock.method(SessionToken, 'findOne', (filter) => {
    if (filter?.token === 'revoked-session-id' || filter?.jti === 'revoked-session-id') {
      return query(null);
    }
    return query({ _id: 'session-token', revokedAt: null });
  });
  t.mock.method(RolePermission, 'findOne', () => query(null));
  t.mock.method(RolePermission, 'find', () => query([]));
  t.mock.method(RolePermission, 'findOneAndUpdate', (_filter, update) => query(update));

  t.mock.method(Student, 'aggregate', async () => [
    { _id: 'Bachelor of Information Technology', total: 2, enrolled: 1 },
    { _id: 'Entertainment and Multimedia Computing', total: 1, enrolled: 1 }
  ]);
  t.mock.method(AcademicRecord, 'aggregate', async () => [
    { academicYear: '2025-2026', semester: '1st Semester', studentCount: 2, recordCount: 2 }
  ]);
  t.mock.method(FacultyEvaluation, 'aggregate', async () => [{ total: 1 }]);
  t.mock.method(AuditLog, 'create', async (entry) => {
    capturedAuditLogs.push(entry);
    return entry;
  });
}

test('A114: Administrator can export overall enrolled student records with enriched fields', async (t) => {
  const { request } = await setupServer(t);
  setupCommonMocks(t);

  const enrolledOnly = mockStudents.filter((s) => s.enrollmentStatus === 'enrolled');

  t.mock.method(Student, 'countDocuments', async (filter) => {
    if (filter?.enrollmentStatus === 'enrolled') return enrolledOnly.length;
    return mockStudents.length;
  });

  t.mock.method(Student, 'find', (filter) => {
    if (filter?.enrollmentStatus === 'enrolled') return query(enrolledOnly);
    return query(mockStudents);
  });

  t.mock.method(AcademicRecord, 'find', () => query(mockRecords));
  t.mock.method(FacultyEvaluation, 'find', () => query([mockEvaluation]));

  // Request all enrolled students for report export
  const res = await request(
    '/api/students/reports/summary?export=true&enrollmentStatus=enrolled',
    { method: 'GET' },
    'admin'
  );
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.students.length, 2);
  assert.equal(body.data.pagination.total, 2);

  // Validate student export payload contains full academic and enrollment fields
  const student = body.data.students[0];
  assert.equal(student.institutionId, '2023-0001');
  assert.equal(student.enrollmentStatus, 'enrolled');
  assert.equal(student.program, 'Bachelor of Information Technology');
  assert.equal(student.department, 'IT');
  assert.equal(student.yearLevel, 3);
  assert.equal(student.section, '3A');
  assert.ok(student.overallGwa !== null);
  assert.ok(student.majorSubjectGwa !== null);
  assert.equal(student.academicRecordCount, 1);
  assert.equal(student.academicPeriods.length, 1);
  assert.equal(student.facultyEvaluation?.evaluationStatus, 'eligible');
});

test('A115: Administrator retrieves and aggregates enrollment records across all programs, year levels, and academic periods', async (t) => {
  const { request } = await setupServer(t);
  setupCommonMocks(t);

  t.mock.method(Student, 'countDocuments', async () => mockStudents.length);
  t.mock.method(Student, 'find', () => query(mockStudents));
  t.mock.method(AcademicRecord, 'find', () => query(mockRecords));
  t.mock.method(FacultyEvaluation, 'find', () => query([mockEvaluation]));

  const res = await request('/api/students/reports/summary', { method: 'GET' }, 'admin');
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.success, true);
  const aggregations = body.data.aggregations;
  assert.ok(aggregations, 'Aggregations must be present in response');

  // 1. Program aggregation across programs
  assert.ok(Array.isArray(aggregations.byProgram));
  assert.ok(aggregations.byProgram.length > 0);
  const itProg = aggregations.byProgram.find((p) => p.program.includes('Information Technology'));
  assert.ok(itProg);
  assert.equal(itProg.departmentCode, 'IT');

  // 2. Year level aggregation
  assert.ok(Array.isArray(aggregations.byYearLevel));
  assert.ok(aggregations.byYearLevel.length > 0);

  // 3. Academic periods aggregation
  assert.ok(Array.isArray(aggregations.byAcademicPeriod));
  assert.equal(aggregations.byAcademicPeriod[0].academicYear, '2025-2026');
  assert.equal(aggregations.byAcademicPeriod[0].semester, '1st Semester');
  assert.equal(aggregations.byAcademicPeriod[0].studentCount, 2);

  // 4. Overall demographic and status aggregation
  assert.equal(aggregations.overall.totalStudents, 3);
  assert.equal(aggregations.overall.enrolledCount, 3);
});

test('A116: Report response delivers multi-format compatible metadata and data structures for Excel, CSV, and PDF', async (t) => {
  const { request } = await setupServer(t);
  setupCommonMocks(t);

  t.mock.method(Student, 'countDocuments', async () => mockStudents.length);
  t.mock.method(Student, 'find', () => query(mockStudents));
  t.mock.method(AcademicRecord, 'find', () => query(mockRecords));
  t.mock.method(FacultyEvaluation, 'find', () => query([mockEvaluation]));

  const res = await request('/api/students/reports/summary?all=true', { method: 'GET' }, 'admin');
  assert.equal(res.status, 200);
  const body = await res.json();

  assert.equal(body.success, true);
  assert.ok(body.data.students.length > 0);
  for (const s of body.data.students) {
    // Required fields for Excel, CSV, and PDF tabular schemas
    assert.ok(typeof s.institutionId === 'string' && s.institutionId.length > 0);
    assert.ok(typeof s.personalInformation === 'object');
    assert.ok(typeof s.program === 'string');
    assert.ok(typeof s.department === 'string');
    assert.ok(typeof s.yearLevel === 'number');
    assert.ok(typeof s.section === 'string');
    assert.ok(typeof s.enrollmentStatus === 'string');
    assert.ok(typeof s.academicStatus === 'object');
  }
});

test('A117: Administrator applies optional filters (Department, Academic Year, Semester, Date Range, Year Level)', async (t) => {
  const { request } = await setupServer(t);
  setupCommonMocks(t);

  let capturedStudentFilter = null;
  t.mock.method(Student, 'countDocuments', async (filter) => {
    capturedStudentFilter = filter;
    return 1;
  });

  t.mock.method(Student, 'find', (filter) => {
    capturedStudentFilter = filter;
    return query([mockStudents[0]]);
  });

  t.mock.method(AcademicRecord, 'find', () => query([mockRecords[0]]));
  t.mock.method(FacultyEvaluation, 'find', () => query([mockEvaluation]));

  let capturedPeriodQuery = null;
  t.mock.method(AcademicRecord, 'distinct', async (_field, filter) => {
    capturedPeriodQuery = filter;
    return ['507f1f77bcf86cd799439001'];
  });

  // Test optional filters: department=IT, academicYear=2025-2026, semester=1st Semester, startDate, endDate, yearLevel=3
  const filterUrl =
    '/api/students/reports/summary?' +
    new URLSearchParams({
      department: 'IT',
      academicYear: '2025-2026',
      semester: '1st Semester',
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      yearLevel: '3',
      enrollmentStatus: 'enrolled'
    }).toString();

  const res = await request(filterUrl, { method: 'GET' }, 'admin');
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.students.length, 1);
  assert.equal(body.data.students[0].institutionId, '2023-0001');

  // Verify Academic Year and Semester were passed to AcademicRecord query
  assert.ok(capturedPeriodQuery);
  assert.equal(capturedPeriodQuery.academicYear, '2025-2026');
  assert.equal(capturedPeriodQuery.semester, '1st Semester');

  // Verify student filter includes matching student ID, enrollmentStatus, and conditions
  assert.deepEqual(capturedStudentFilter._id, { $in: ['507f1f77bcf86cd799439001'] });
  assert.equal(capturedStudentFilter.enrollmentStatus, 'enrolled');
});

test('A119: Active administrator with export_reports permission can invoke export functions and writes audit log', async (t) => {
  const { request } = await setupServer(t);
  setupCommonMocks(t);

  t.mock.method(Student, 'countDocuments', async () => mockStudents.length);
  t.mock.method(Student, 'find', () => query(mockStudents));
  t.mock.method(AcademicRecord, 'find', () => query(mockRecords));
  t.mock.method(FacultyEvaluation, 'find', () => query([mockEvaluation]));

  // 1. Dedicated export route /api/students/reports/export
  const exportRes = await request('/api/students/reports/export', { method: 'GET' }, 'admin');
  assert.equal(exportRes.status, 200);
  const exportBody = await exportRes.json();
  assert.equal(exportBody.success, true);
  assert.equal(exportBody.data.students.length, 3);

  // Verify audit log entry was created for the export
  const loggedEntry = capturedAuditLogs.find((entry) => entry.action === 'EXPORT_STUDENT_REPORTS');
  assert.ok(loggedEntry, 'Audit log entry must be created on export');
  assert.equal(loggedEntry.action, 'EXPORT_STUDENT_REPORTS');
  assert.equal(loggedEntry.userRole, 'admin');
  assert.equal(loggedEntry.targetType, 'reports');
  assert.equal(loggedEntry.details.recordCount, 3);
});

test('A119: Administrator without export_reports permission is forbidden (403)', async (t) => {
  const { request } = await setupServer(t);
  setupCommonMocks(t);

  // Configure role permissions lacking export_reports
  t.mock.method(RolePermission, 'findOne', () =>
    query({ role: 'admin', permissions: ['manage_users', 'view_reports'] })
  );

  // Dedicated export route should return 403
  const exportRes = await request('/api/students/reports/export', { method: 'GET' }, 'admin');
  assert.equal(exportRes.status, 403);
  const exportBody = await exportRes.json();
  assert.equal(exportBody.success, false);

  // Summary with export=true should return 403
  const summaryRes = await request(
    '/api/students/reports/summary?export=true',
    { method: 'GET' },
    'admin'
  );
  assert.equal(summaryRes.status, 403);
  const summaryBody = await summaryRes.json();
  assert.equal(summaryBody.success, false);
  assert.match(summaryBody.message, /Export functions are strictly restricted/i);
});

test('A119: Non-administrative roles (faculty, student) cannot invoke export endpoints (403 Forbidden)', async (t) => {
  const { request } = await setupServer(t);
  setupCommonMocks(t);

  // Faculty invoking dedicated export route -> 403
  const facExportRes = await request('/api/students/reports/export', { method: 'GET' }, 'faculty');
  assert.equal(facExportRes.status, 403);

  // Student invoking dedicated export route -> 403
  const stuExportRes = await request('/api/students/reports/export', { method: 'GET' }, 'student');
  assert.equal(stuExportRes.status, 403);

  // Faculty invoking summary export -> 403
  const facSummaryRes = await request(
    '/api/students/reports/summary?export=true',
    { method: 'GET' },
    'faculty'
  );
  assert.equal(facSummaryRes.status, 403);

  // Student invoking summary export -> 403
  const stuSummaryRes = await request(
    '/api/students/reports/summary?export=true',
    { method: 'GET' },
    'student'
  );
  assert.equal(stuSummaryRes.status, 403);
});

test('A119: Unauthenticated callers or revoked/inactive admin accounts cannot export reports (401/403)', async (t) => {
  const { request } = await setupServer(t);
  setupCommonMocks(t);

  // 1. Unauthenticated request -> 401
  const unauthRes = await request('/api/students/reports/export', { method: 'GET' }, null);
  assert.equal(unauthRes.status, 401);

  // 2. Inactive administrator account -> 403
  const inactiveRes = await request(
    '/api/students/reports/export',
    { method: 'GET' },
    'admin',
    { userId: 'inactive-admin-id', role: 'admin', jti: 'test-session-id' }
  );
  assert.equal(inactiveRes.status, 403);

  // 3. Revoked session token -> 401
  const revokedRes = await request(
    '/api/students/reports/export',
    { method: 'GET' },
    'admin',
    { userId: '507f1f77bcf86cd799439099', role: 'admin', jti: 'revoked-session-id' }
  );
  assert.equal(revokedRes.status, 401);
});

test('A119: Non-admin roles cannot be granted export_reports permission in role management (400 Bad Request)', async (t) => {
  const { request } = await setupServer(t);
  setupCommonMocks(t);

  // Attempting to grant export_reports to faculty -> 400
  const facultyGrant = await request(
    '/api/permissions/faculty',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        permissions: ['view_student_records', 'submit_evaluations', 'export_reports']
      })
    },
    'admin'
  );
  assert.equal(facultyGrant.status, 400);
  const facBody = await facultyGrant.json();
  assert.equal(facBody.success, false);
  assert.match(facBody.message, /Export permissions can only be granted to administrative roles/i);

  // Attempting to grant export_reports to student -> 400
  const studentGrant = await request(
    '/api/permissions/student',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        permissions: ['view_own_profile', 'export_reports']
      })
    },
    'admin'
  );
  assert.equal(studentGrant.status, 400);
  const stuBody = await studentGrant.json();
  assert.equal(stuBody.success, false);
  assert.match(stuBody.message, /Export permissions can only be granted to administrative roles/i);

  // Granting export_reports to admin -> 200
  const adminGrant = await request(
    '/api/permissions/admin',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        permissions: ['manage_users', 'view_reports', 'export_reports', 'view_audit_logs']
      })
    },
    'admin'
  );
  assert.equal(adminGrant.status, 200);
  const adminBody = await adminGrant.json();
  assert.equal(adminBody.success, true);
  assert.ok(adminBody.data.permissions.includes('export_reports'));
});
