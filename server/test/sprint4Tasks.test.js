const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');

const AdminUser = require('../models/AdminUser');
const FacultyUser = require('../models/FacultyUser');
const Student = require('../models/Student');
const SessionToken = require('../models/SessionToken');
const RolePermission = require('../models/RolePermission');
const AuditLog = require('../models/AuditLog');
const FacultyEvaluation = require('../models/FacultyEvaluation');
const AcademicRecord = require('../models/AcademicRecord');
const StudentStatusHistory = require('../models/StudentStatusHistory');

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
  process.env.JWT_SECRET = 'sprint4-tasks-test-secret';
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const app = express();
  app.use(express.json());
  app.use('/api/students', require('../routes/studentRoutes'));
  app.use('/api/permissions', require('../routes/permissionRoutes'));
  app.use('/api/audit-logs', require('../routes/auditLogRoutes'));

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const request = (path, options = {}, role = 'admin') => {
    const headers = { ...options.headers };
    if (role) {
      headers.Authorization = `Bearer ${jwt.sign(
        { userId: role, role, jti: 'test-session-id' },
        process.env.JWT_SECRET
      )}`;
    }
    return fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      ...options,
      headers
    });
  };

  return { request };
}

test('A111: Authorized administrator can view recorded faculty evaluation statuses and remarks', async (t) => {
  const { request } = await setupServer(t);

  const mockStudent = {
    _id: '507f1f77bcf86cd799439011',
    institutionId: '2023-0001',
    accountStatus: 'active',
    personalInformation: { firstName: 'Juan', lastName: 'Dela Cruz' },
    classification: { program: 'Bachelor of Information Technology' },
    religiousInformation: { religion: 'Roman Catholic' },
    academicStatus: { currentStatus: 'Regular', isOnProbation: false }
  };

  const mockEvaluation = {
    _id: '607f1f77bcf86cd799439022',
    studentId: mockStudent._id,
    facultyId: { username: 'prof.smith', role: 'faculty' },
    evaluationStatus: 'eligible',
    reasons: ['Prerequisites cleared', 'Dean list standing'],
    remarks: 'Student has completed all prerequisites and is recommended for advanced coursework.',
    evaluatedAt: new Date('2026-03-15T08:00:00Z')
  };

  t.mock.method(AdminUser, 'findById', (id) =>
    query(id === 'admin' ? { _id: id, role: 'admin', accountStatus: 'active' } : null)
  );
  t.mock.method(Student, 'findById', (id) =>
    query(id === 'student' ? { _id: id, role: 'student', accountStatus: 'active' } : null)
  );
  t.mock.method(SessionToken, 'findOne', () => query({ _id: 'session-token' }));
  t.mock.method(RolePermission, 'findOne', () => query(null));

  t.mock.method(Student, 'countDocuments', async () => 1);
  t.mock.method(Student, 'find', () => query([mockStudent]));
  t.mock.method(Student, 'findOne', () => query(mockStudent));
  t.mock.method(AcademicRecord, 'find', () => query([]));
  t.mock.method(StudentStatusHistory, 'find', () => query([]));
  t.mock.method(FacultyEvaluation, 'aggregate', async () => [{ total: 1 }]);
  t.mock.method(FacultyEvaluation, 'find', () => query([mockEvaluation]));
  t.mock.method(FacultyEvaluation, 'findOne', () => query(mockEvaluation));

  // 1. Institutional summary report includes evaluation status, reasons, remarks, and evaluator info
  const summaryRes = await request('/api/students/reports/summary', { method: 'GET' }, 'admin');
  assert.equal(summaryRes.status, 200);
  const summaryBody = await summaryRes.json();
  assert.equal(summaryBody.success, true);
  assert.equal(summaryBody.data.students.length, 1);

  const studentSummary = summaryBody.data.students[0];
  assert.ok(studentSummary.facultyEvaluation, 'facultyEvaluation must be populated');
  assert.equal(studentSummary.facultyEvaluation.evaluationStatus, 'eligible');
  assert.deepEqual(studentSummary.facultyEvaluation.reasons, ['Prerequisites cleared', 'Dean list standing']);
  assert.equal(
    studentSummary.facultyEvaluation.remarks,
    'Student has completed all prerequisites and is recommended for advanced coursework.'
  );
  assert.equal(studentSummary.facultyEvaluation.faculty.username, 'prof.smith');

  // 2. Individual student report returns full evaluation details
  const reportRes = await request(`/api/students/${mockStudent.institutionId}/report`, { method: 'GET' }, 'admin');
  assert.equal(reportRes.status, 200);
  const reportBody = await reportRes.json();
  assert.equal(reportBody.success, true);
  assert.equal(reportBody.data.facultyEvaluation.evaluationStatus, 'eligible');
  assert.equal(reportBody.data.facultyEvaluation.remarks, mockEvaluation.remarks);

  // 3. Unauthorized access denied for students and unauthenticated callers
  const unauthRes = await request('/api/students/reports/summary', { method: 'GET' }, null);
  assert.equal(unauthRes.status, 401);

  const studentRes = await request('/api/students/reports/summary', { method: 'GET' }, 'student');
  assert.equal(studentRes.status, 403);
});

test('A112: Administrator manages access permissions and prevents self-lockout', async (t) => {
  const { request } = await setupServer(t);

  t.mock.method(AdminUser, 'findById', (id) =>
    query(id === 'admin' ? { _id: id, role: 'admin', accountStatus: 'active' } : null)
  );
  t.mock.method(Student, 'findById', (id) =>
    query(id === 'student' ? { _id: id, role: 'student', accountStatus: 'active' } : null)
  );
  t.mock.method(SessionToken, 'findOne', () => query({ _id: 'session-token' }));
  t.mock.method(RolePermission, 'findOne', () => query(null));
  t.mock.method(RolePermission, 'find', () => query([]));

  let savedAuditLog = null;
  t.mock.method(AuditLog, 'create', async (log) => {
    savedAuditLog = log;
    return log;
  });

  t.mock.method(RolePermission, 'findOneAndUpdate', async (_filter, update) => {
    return { role: update.role, permissions: update.permissions };
  });

  // 1. Fetch available permissions
  const getPerms = await request('/api/permissions', { method: 'GET' }, 'admin');
  assert.equal(getPerms.status, 200);
  const permsBody = await getPerms.json();
  assert.ok(permsBody.data.availablePermissions.includes('manage_users'));
  assert.ok(permsBody.data.availablePermissions.includes('view_audit_logs'));

  // 2. Administrator updates faculty role permissions
  const updateFaculty = await request(
    '/api/permissions/faculty',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        permissions: ['view_student_records', 'submit_evaluations', 'view_reports']
      })
    },
    'admin'
  );
  assert.equal(updateFaculty.status, 200);
  assert.equal(savedAuditLog?.action, 'ROLE_PERMISSIONS_UPDATED');
  assert.equal(savedAuditLog?.details.role, 'faculty');

  // 3. Security safeguard: admin role cannot remove manage_users (prevents lockout)
  const invalidAdminUpdate = await request(
    '/api/permissions/admin',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        permissions: ['view_reports']
      })
    },
    'admin'
  );
  assert.equal(invalidAdminUpdate.status, 400);

  // 4. Non-admin cannot manage permissions
  const deniedUpdate = await request(
    '/api/permissions/faculty',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions: [] })
    },
    'student'
  );
  assert.equal(deniedUpdate.status, 403);
});

test('A113: Administrator monitors system activities with pagination, category filter, and search', async (t) => {
  const { request } = await setupServer(t);

  const mockLogs = [
    {
      _id: '707f1f77bcf86cd799439001',
      userId: { username: 'admin', role: 'admin' },
      userRole: 'admin',
      userModel: 'AdminUser',
      action: 'SYSTEM_SETTINGS_UPDATED',
      targetType: 'system_settings',
      targetId: null,
      timestamp: new Date('2026-03-20T10:00:00Z'),
      details: { setting: 'smtp', newEnabled: true }
    },
    {
      _id: '707f1f77bcf86cd799439002',
      userId: { username: 'prof.smith', role: 'faculty' },
      userRole: 'faculty',
      userModel: 'FacultyUser',
      action: 'UPDATE_FACULTY_EVALUATION',
      targetType: 'faculty_evaluation',
      targetId: '607f1f77bcf86cd799439022',
      timestamp: new Date('2026-03-20T11:00:00Z'),
      details: { institutionId: '2023-0001', evaluationStatus: 'eligible' }
    }
  ];

  t.mock.method(AdminUser, 'findById', (id) =>
    query(id === 'admin' ? { _id: id, role: 'admin', accountStatus: 'active' } : null)
  );
  t.mock.method(Student, 'findById', (id) =>
    query(id === 'student' ? { _id: id, role: 'student', accountStatus: 'active' } : null)
  );
  t.mock.method(SessionToken, 'findOne', () => query({ _id: 'session-token' }));
  t.mock.method(RolePermission, 'findOne', () => query(null));

  t.mock.method(AuditLog, 'countDocuments', async (filter) => {
    if (filter && filter.action && filter.action.$in) {
      return 1;
    }
    return mockLogs.length;
  });

  t.mock.method(AuditLog, 'find', (filter) => {
    if (filter && filter.action && filter.action.$in) {
      return query([mockLogs[1]]);
    }
    return query(mockLogs);
  });

  // 1. Administrator views paginated audit logs
  const logsRes = await request('/api/audit-logs?page=1&limit=20', { method: 'GET' }, 'admin');
  assert.equal(logsRes.status, 200);
  const logsBody = await logsRes.json();
  assert.equal(logsBody.success, true);
  assert.equal(logsBody.data.auditLogs.length, 2);
  assert.equal(logsBody.data.pagination.page, 1);
  assert.equal(logsBody.data.pagination.limit, 20);
  assert.equal(logsBody.data.pagination.total, 2);

  // 2. Administrator filters by category (FACULTY_EVALUATION)
  const categoryRes = await request('/api/audit-logs?category=FACULTY_EVALUATION', { method: 'GET' }, 'admin');
  assert.equal(categoryRes.status, 200);
  const categoryBody = await categoryRes.json();
  assert.equal(categoryBody.data.auditLogs.length, 1);
  assert.equal(categoryBody.data.auditLogs[0].action, 'UPDATE_FACULTY_EVALUATION');

  // 3. Unauthorized callers (anonymous / student) are denied access
  const unauthRes = await request('/api/audit-logs', { method: 'GET' }, null);
  assert.equal(unauthRes.status, 401);

  const studentRes = await request('/api/audit-logs', { method: 'GET' }, 'student');
  assert.equal(studentRes.status, 403);
});
