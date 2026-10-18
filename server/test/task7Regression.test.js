const assert = require('node:assert/strict');
const test = require('node:test');
const crypto = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');
const FacultyUser = require('../models/FacultyUser');
const Student = require('../models/Student');
const SessionToken = require('../models/SessionToken');
const RolePermission = require('../models/RolePermission');
const AuditLog = require('../models/AuditLog');
const StudentStatusHistory = require('../models/StudentStatusHistory');
const AcademicRecord = require('../models/AcademicRecord');
const FacultyEvaluation = require('../models/FacultyEvaluation');

async function serve(t, path, router) {
  const app = express();
  app.use(express.json());
  app.use(path, router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}${path}`;
}

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const query = value => {
  const result = Promise.resolve(value);
  result.select = () => result;
  result.lean = async () => value;
  return result;
};
const accountModels = { admin: AdminUser, faculty: FacultyUser, student: Student };

function mockIdentifierLookup(t, role, value) {
  for (const [accountRole, Model] of Object.entries(accountModels)) {
    t.mock.method(Model, 'findOne', () => query(accountRole === role ? value : null));
  }
}

test('verified password reset is single-use, including concurrent confirmations', async t => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'task7-regression-only';
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  const state = {
    _id: '507f1f77bcf86cd799439011',
    username: 'test.admin',
    role: 'admin',
    accountStatus: 'active',
    passwordResetCodeHash: hash('123456'),
    passwordResetExpiresAt: new Date(Date.now() + 60000),
    passwordResetAttempts: 0,
    save: async () => {}
  };
  mockIdentifierLookup(t, 'admin', state);
  t.mock.method(AdminUser, 'findOneAndUpdate', async (filter, update) => {
    if (filter.accountStatus !== state.accountStatus
      || filter.passwordResetCodeHash !== state.passwordResetCodeHash
      || !(state.passwordResetExpiresAt > filter.passwordResetExpiresAt.$gt)) return null;
    Object.assign(state, update.$set);
    for (const field of Object.keys(update.$unset || {})) delete state[field];
    return { ...state };
  });
  const revocations = t.mock.method(SessionToken, 'updateMany', async () => ({}));
  const base = await serve(t, '/auth', require('../routes/authRoutes'));
  const post = (path, body) => fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const verification = await post('/password-reset/verify', { username: state.username, code: '123456' });
  assert.equal(verification.status, 200);
  const { resetAuthorization } = await verification.json();
  assert.equal((await post('/password-reset/verify', { username: state.username, code: '123456' })).status, 400);
  const body = { resetAuthorization, newPassword: 'Fictional-test-password' };
  const responses = await Promise.all([
    post('/password-reset/confirm', body),
    post('/password-reset/confirm', body)
  ]);
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 400]);
  assert.equal((await post('/password-reset/confirm', body)).status, 400);
  assert.equal(revocations.mock.callCount(), 1);
  assert.equal(state.passwordResetCodeHash, undefined);
});

test('inactive accounts cannot verify password-reset codes', async t => {
  const inactive = {
    _id: '507f1f77bcf86cd799439011',
    username: 'inactive.admin',
    role: 'admin',
    accountStatus: 'inactive',
    passwordResetCodeHash: hash('123456'),
    passwordResetExpiresAt: new Date(Date.now() + 60000),
    passwordResetAttempts: 0,
    save: async () => {}
  };
  mockIdentifierLookup(t, 'admin', inactive);
  const base = await serve(t, '/auth', require('../routes/authRoutes'));
  const response = await fetch(base + '/password-reset/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: inactive.username, code: '123456' })
  });
  assert.equal(response.status, 400);
});

test('authorized academic status updates correctly set the probation flag', async t => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'task7-regression-only';
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  const admin = { _id: 'admin', role: 'admin', username: 'admin', accountStatus: 'active' };
  const student = { _id: 'student', institutionId: 'test-id', academicStatus: {}, save: async () => {} };
  t.mock.method(AdminUser, 'findById', () => query(admin));
  t.mock.method(Student, 'findById', () => query(null));
  t.mock.method(Student, 'findOne', () => query(student));
  t.mock.method(SessionToken, 'findOne', () => query({ _id: 'session' }));
  t.mock.method(RolePermission, 'findOne', () => query(null));
  t.mock.method(StudentStatusHistory, 'create', async data => ({ _id: 'history', ...data }));
  t.mock.method(AuditLog, 'create', async () => ({}));
  const base = await serve(t, '/students', require('../routes/studentRoutes'));
  const token = jwt.sign({ jti: 'test-session', userId: 'admin', role: 'admin' }, process.env.JWT_SECRET);

  for (const [status, expected] of [
    ['probationary', true],
    ['regular', false],
    ['Probation', true],
    ['irregular', false]
  ]) {
    const response = await fetch(base + '/test-id/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, reason: expected ? 'Due to failing grades' : undefined })
    });
    assert.equal(response.status, 200);
    assert.equal(student.academicStatus.isOnProbation, expected);
    assert.equal(student.academicStatus.currentStatus, status);
    assert.equal(student.academicStatus.probationReason, expected ? 'Due to failing grades' : undefined);
  }
});

test('student report uses the authenticated student account document', async t => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'task7-regression-only';
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  const student = {
    _id: 'account',
    role: 'student',
    username: 'student',
    accountStatus: 'active',
    institutionId: 'own-id'
  };
  t.mock.method(Student, 'findById', () => query(student));
  t.mock.method(SessionToken, 'findOne', () => query({ _id: 'session' }));
  t.mock.method(RolePermission, 'findOne', () => query(null));
  t.mock.method(Student, 'findOne', filter => {
    assert.deepEqual(filter, { _id: 'account' });
    return query(student);
  });
  t.mock.method(AcademicRecord, 'find', () => ({
    sort() { return this; },
    lean: async () => [{
      academicYear: '2025-2026',
      semester: '1st Semester',
      isDemo: true,
      subjects: []
    }]
  }));
  t.mock.method(StudentStatusHistory, 'find', () => ({
    sort() { return this; },
    lean: async () => [{
      status: 'Regular',
      reason: 'Reviewed',
      effectiveDate: '2026-01-01',
      remarks: 'Current status'
    }]
  }));
  const evaluation = {
    evaluationStatus: 'eligible',
    reasons: ['Requirements met'],
    remarks: 'Ready for enrollment'
  };
  t.mock.method(FacultyEvaluation, 'findOne', filter => {
    assert.equal(filter.studentId, 'account');
    return {
      sort() { return this; },
      select(fields) {
        assert.equal(fields, '-_id evaluationStatus reasons remarks evaluatedAt');
        return this;
      },
      lean: async () => evaluation
    };
  });
  const base = await serve(t, '/me', require('../routes/meRoutes'));
  const token = jwt.sign({ jti: 'test-session', userId: 'account', role: 'student' }, process.env.JWT_SECRET);
  const response = await fetch(base + '/student/report?studentId=another', {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(response.status, 200);
  const data = (await response.json()).data;
  assert.equal(data.student.institutionId, 'own-id');
  assert.deepEqual(data.facultyEvaluation, evaluation);
  assert.equal(data.academicRecords[0].isDemo, true);
  assert.deepEqual(data.statusHistory, [{
    status: 'Regular',
    reason: 'Reviewed',
    effectiveDate: '2026-01-01',
    remarks: 'Current status'
  }]);
});
