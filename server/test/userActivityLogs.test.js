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
const { parseDeviceInfo } = require('../utils/deviceInfo');

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
  process.env.JWT_SECRET = 'user-activity-logs-test-secret';
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const app = express();
  app.use(express.json());
  app.use('/api/audit-logs', require('../routes/auditLogRoutes'));

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const request = (path, options = {}, userPayload = { userId: 'student123', role: 'student' }) => {
    const headers = { ...options.headers };
    if (userPayload) {
      headers.Authorization = `Bearer ${jwt.sign(
        { userId: userPayload.userId, role: userPayload.role, jti: 'test-session-id' },
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

test('DeviceInfo utility accurately extracts browser, OS, and IP without fabricating details', () => {
  const mockReq = {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'x-forwarded-for': '203.0.113.195'
    },
    ip: '127.0.0.1'
  };

  const parsed = parseDeviceInfo(mockReq);
  assert.equal(parsed.browser, 'Google Chrome');
  assert.equal(parsed.os, 'Windows');
  assert.equal(parsed.ip, '203.0.113.195');
  assert.equal(parsed.summary, 'Google Chrome on Windows');

  // Empty fallback
  const emptyParsed = parseDeviceInfo(null);
  assert.equal(emptyParsed.browser, '');
  assert.equal(emptyParsed.os, '');
  assert.equal(emptyParsed.summary, 'Web browser');
});

test('Student can view own activity history with human-readable descriptions', async (t) => {
  const { request } = await setupServer(t);
  const studentId = '507f1f77bcf86cd799439011';
  const institutionId = '2401105814';

  t.mock.method(Student, 'findById', (id) =>
    query(id === studentId ? { _id: studentId, institutionId, role: 'student', accountStatus: 'active' } : null)
  );
  t.mock.method(SessionToken, 'findOne', () => query({ _id: 'session-token' }));

  const mockStudentLogs = [
    {
      _id: '807f1f77bcf86cd799439101',
      userId: studentId,
      userRole: 'student',
      userModel: 'Student',
      action: 'USER_LOGIN',
      targetType: 'session',
      targetId: studentId,
      timestamp: new Date('2026-11-16T08:00:00Z'),
      details: {
        method: 'password',
        browser: 'Google Chrome',
        os: 'Windows',
        ip: '127.0.0.1',
        summary: 'Google Chrome on Windows'
      }
    },
    {
      _id: '807f1f77bcf86cd799439102',
      userId: studentId,
      userRole: 'student',
      userModel: 'Student',
      action: 'STUDENT_PROFILE_UPDATED',
      targetType: 'student_profile',
      targetId: studentId,
      timestamp: new Date('2026-11-16T08:30:00Z'),
      details: {
        isTransferee: true,
        studentType: 'transferee'
      }
    },
    {
      _id: '807f1f77bcf86cd799439103',
      userId: '607f1f77bcf86cd799439099', // Admin actor
      userRole: 'admin',
      userModel: 'AdminUser',
      action: 'UPDATE_STUDENT_STATUS',
      targetType: 'student',
      targetId: studentId,
      timestamp: new Date('2026-11-16T09:00:00Z'),
      details: {
        institutionId,
        previousStatus: 'regular',
        status: 'probation',
        reason: 'Low GWA in major courses'
      }
    }
  ];

  t.mock.method(AuditLog, 'countDocuments', async () => mockStudentLogs.length);
  t.mock.method(AuditLog, 'find', () => query(mockStudentLogs));

  const res = await request('/api/audit-logs/mine?page=1&limit=20', { method: 'GET' }, { userId: studentId, role: 'student' });
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.auditLogs.length, 3);

  // Check login entry
  const loginEntry = body.data.auditLogs[0];
  assert.equal(loginEntry.title, 'Sign In');
  assert.equal(loginEntry.description, 'You signed in to your SAPES account from Google Chrome on Windows (127.0.0.1).');
  assert.equal(loginEntry.category, 'Security');
  assert.equal(loginEntry.isSecuritySensitive, true);
  assert.equal(loginEntry.actor, 'You');

  // Check transferee classification update
  const profileEntry = body.data.auditLogs[1];
  assert.equal(profileEntry.title, 'Classification Updated');
  assert.equal(profileEntry.description, 'You identified yourself as a transferee.');
  assert.equal(profileEntry.category, 'Profile');

  // Check academic status changed by admin
  const statusEntry = body.data.auditLogs[2];
  assert.equal(statusEntry.title, 'Academic Status Changed');
  assert.equal(statusEntry.description, 'Your academic status was changed from Regular to Probation (Low GWA in major courses).');
  assert.equal(statusEntry.category, 'Academic');
  assert.equal(statusEntry.actor, 'Administrator');
});

test('Faculty can view own evaluations and approvals in activity history', async (t) => {
  const { request } = await setupServer(t);
  const facultyId = '507f1f77bcf86cd799439022';

  t.mock.method(FacultyUser, 'findById', (id) =>
    query(id === facultyId ? { _id: facultyId, role: 'faculty', accountStatus: 'active' } : null)
  );
  t.mock.method(SessionToken, 'findOne', () => query({ _id: 'session-token' }));

  const mockFacultyLogs = [
    {
      _id: '807f1f77bcf86cd799439201',
      userId: facultyId,
      userRole: 'faculty',
      userModel: 'FacultyUser',
      action: 'COURSE_EVALUATION_UPDATED',
      targetType: 'course_evaluation',
      targetId: '507f1f77bcf86cd799439011',
      timestamp: new Date('2026-11-16T10:00:00Z'),
      details: {
        institutionId: '2401105814'
      }
    },
    {
      _id: '807f1f77bcf86cd799439202',
      userId: facultyId,
      userRole: 'faculty',
      userModel: 'FacultyUser',
      action: 'STUDENT_ENROLLMENT_APPROVED',
      targetType: 'student',
      targetId: '507f1f77bcf86cd799439011',
      timestamp: new Date('2026-11-16T11:00:00Z'),
      details: {
        institutionId: '2401105814',
        enrollmentStatus: 'enrolled'
      }
    }
  ];

  t.mock.method(AuditLog, 'countDocuments', async () => mockFacultyLogs.length);
  t.mock.method(AuditLog, 'find', () => query(mockFacultyLogs));

  const res = await request('/api/audit-logs/mine?page=1&limit=20', { method: 'GET' }, { userId: facultyId, role: 'faculty' });
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.auditLogs.length, 2);

  // Faculty evaluation entry
  const evalEntry = body.data.auditLogs[0];
  assert.equal(evalEntry.title, 'Evaluation Submitted');
  assert.equal(evalEntry.description, 'You submitted an evaluation for Student 2401105814.');
  assert.equal(evalEntry.category, 'Academic');
  assert.equal(evalEntry.actor, 'You');

  // Enrollment approval entry
  const approvalEntry = body.data.auditLogs[1];
  assert.equal(approvalEntry.title, 'Enrollment Approved');
  assert.equal(approvalEntry.description, 'You approved enrollment for Student 2401105814.');
  assert.equal(approvalEntry.category, 'Enrollment');
  assert.equal(approvalEntry.actor, 'You');
});

test('Category filter works on /api/audit-logs/mine', async (t) => {
  const { request } = await setupServer(t);
  const facultyId = '507f1f77bcf86cd799439022';

  t.mock.method(FacultyUser, 'findById', (id) =>
    query(id === facultyId ? { _id: facultyId, role: 'faculty', accountStatus: 'active' } : null)
  );
  t.mock.method(SessionToken, 'findOne', () => query({ _id: 'session-token' }));

  let capturedFilter = null;
  t.mock.method(AuditLog, 'countDocuments', async (filter) => {
    capturedFilter = filter;
    return 1;
  });
  t.mock.method(AuditLog, 'find', (filter) => {
    capturedFilter = filter;
    return query([]);
  });

  const res = await request('/api/audit-logs/mine?category=security', { method: 'GET' }, { userId: facultyId, role: 'faculty' });
  assert.equal(res.status, 200);
  assert.ok(capturedFilter);
  assert.ok(capturedFilter.action);
  assert.ok(Array.isArray(capturedFilter.action.$in));
  assert.ok(capturedFilter.action.$in.includes('USER_LOGIN'));
  assert.ok(capturedFilter.action.$in.includes('PASSWORD_CHANGED'));
});

test('Unauthorized users cannot access /api/audit-logs/mine', async (t) => {
  const { request } = await setupServer(t);

  // 1. Missing token
  const unauthRes = await request('/api/audit-logs/mine', { method: 'GET' }, null);
  assert.equal(unauthRes.status, 401);

  // 2. Admin cannot call /mine (admin uses /api/audit-logs)
  t.mock.method(AdminUser, 'findById', (id) =>
    query({ _id: id, role: 'admin', accountStatus: 'active' })
  );
  const adminRes = await request('/api/audit-logs/mine', { method: 'GET' }, { userId: 'admin1', role: 'admin' });
  assert.equal(adminRes.status, 403);
});
