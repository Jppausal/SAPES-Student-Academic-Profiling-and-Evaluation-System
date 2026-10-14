const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const AcademicRecord = require('../models/AcademicRecord');
const SessionToken = require('../models/SessionToken');
const RolePermission = require('../models/RolePermission');
const AuditLog = require('../models/AuditLog');
const { planBackfill } = require('../scripts/backfillStudentIdentity');

function query(value) {
  const result = Promise.resolve(value);
  result.select = () => result;
  result.lean = async () => value;
  return result;
}

async function fixture(t) {
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'a105-a107-test-only';
  t.after(() => { if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; });
  const adminId = '507f1f77bcf86cd799439010';
  const user = { _id: '507f1f77bcf86cd799439011', role: 'student', firstName: 'Alex', lastName: 'Rivera', accountStatus: 'active', studentNumber: '9900000101', save: async () => {} };
  const student = { _id: '507f1f77bcf86cd799439012', userId: user._id, institutionId: user.studentNumber, accountStatus: 'active', personalInformation: { firstName: 'Alex', middleName: 'Keep', lastName: 'Rivera', suffix: 'Jr.' }, contactInformation: {}, save: async () => {} };
  const audits = [];
  t.mock.method(User, 'findById', id => query(String(id) === adminId ? { _id: adminId, role: 'admin', accountStatus: 'active' } : user));
  t.mock.method(User, 'findByIdAndUpdate', async (_id, updates) => { Object.assign(user, updates); return user; });
  t.mock.method(User, 'updateOne', async (filter, update) => { assert.equal(filter._id, student.userId); Object.assign(user, update.$set); return { modifiedCount: 1 }; });
  t.mock.method(Student, 'findById', () => query(null));
  t.mock.method(Student, 'findOne', () => query(student));
  const mirrored = t.mock.method(Student, 'updateOne', async (filter, update) => { assert.equal(filter.userId, user._id); Object.assign(student, update.$set); return { modifiedCount: 1 }; });
  t.mock.method(SessionToken, 'findOne', () => query({ _id: 'session' }));
  const revoked = t.mock.method(SessionToken, 'updateMany', async () => ({}));
  t.mock.method(RolePermission, 'findOne', () => query(null));
  t.mock.method(AuditLog, 'create', async event => { audits.push(event); return event; });
  const app = express(); app.use(express.json());
  app.use('/users', require('../routes/userRoutes'));
  app.use('/students', require('../routes/studentRoutes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const token = jwt.sign({ userId: adminId, jti: 'test-session' }, process.env.JWT_SECRET);
  const put = async (path, body) => fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { user, student, put, revoked, mirrored, audits };
}

test('A105 status endpoint mirrors deactivation and reactivation without changing profile data', async t => {
  const { user, student, put, revoked } = await fixture(t);
  const before = JSON.stringify(student.personalInformation);
  for (const status of ['inactive', 'active', 'suspended', 'active']) {
    assert.equal((await put(`/users/${user._id}/status`, { accountStatus: status })).status, 200);
    assert.equal(user.accountStatus, status); assert.equal(student.accountStatus, status);
  }
  assert.equal(revoked.mock.callCount(), 2);
  assert.equal(JSON.stringify(student.personalInformation), before);
});

test('A105 faculty/admin status changes do not create or update Student documents', async t => {
  const { user, put, mirrored } = await fixture(t);
  for (const role of ['faculty', 'admin']) {
    user.role = role;
    assert.equal((await put(`/users/${user._id}/status`, { accountStatus: 'inactive' })).status, 200);
  }
  assert.equal(mirrored.mock.callCount(), 0);
});

test('A105/A106 account editor synchronizes student status and names', async t => {
  const { user, student, put, revoked } = await fixture(t);
  assert.equal((await put(`/users/${user._id}`, { accountStatus: 'inactive', firstName: 'Updated', lastName: 'Name' })).status, 200);
  assert.equal(student.accountStatus, 'inactive');
  assert.equal(student.personalInformation.firstName, user.firstName);
  assert.equal(student.personalInformation.lastName, user.lastName);
  assert.equal(student.personalInformation.middleName, 'Keep');
  assert.equal(student.personalInformation.suffix, 'Jr.');
  assert.equal(revoked.mock.callCount(), 1);
});

test('A106 admin profile name edits synchronize only changed User name fields', async t => {
  const { user, student, put, audits } = await fixture(t);
  const originalId = student.institutionId;
  assert.equal((await put(`/students/${originalId}`, { personalInformation: { firstName: 'Renamed', middleName: 'Middle', suffix: 'III' } })).status, 200);
  assert.equal(user.firstName, 'Renamed'); assert.equal(user.lastName, 'Rivera');
  assert.equal(student.institutionId, originalId); assert.equal(student.userId, user._id);
  assert.equal(student.personalInformation.middleName, 'Middle');
  assert.equal(student.personalInformation.suffix, 'III');
  assert.equal(audits[0].action, 'UPDATE_STUDENT_PROFILE');
  assert.ok(!JSON.stringify(audits).includes('Renamed'));
});

test('A106 account editor rejects blank names instead of desynchronizing the profile', async t => {
  const { user, student, put } = await fixture(t);
  for (const field of ['firstName', 'lastName']) {
    assert.equal((await put(`/users/${user._id}`, { [field]: '  ' })).status, 400);
    assert.equal(user[field], student.personalInformation[field]);
  }
});

test('A107 academic record save leaves Student profile and status unchanged', async t => {
  const { student, put } = await fixture(t);
  const before = JSON.stringify(student);
  t.mock.method(AcademicRecord, 'findOneAndUpdate', async (filter, update) => ({ _id: 'term', ...filter, subjects: update.$set.subjects }));
  const response = await put(`/students/${student.institutionId}/academic-records`, { academicYear: '2025-2026', semester: '1st Semester', subjects: [{ subjectCode: 'IT101', subjectName: 'Test subject', units: 3, grade: 1.5, isMajor: true, status: 'Passed' }] });
  assert.equal(response.status, 200); assert.equal(JSON.stringify(student), before);
});

test('A105/A106 backfill fills only missing names, mirrors status, and is idempotent', () => {
  const user = { role: 'student', accountStatus: 'inactive', firstName: 'Alex', lastName: 'Rivera' };
  const student = { accountStatus: 'active', personalInformation: { firstName: 'Existing', lastName: '  ', middleName: 'Preserved', suffix: 'Jr.' } };
  assert.deepEqual(planBackfill(student, user), { accountStatus: 'inactive', 'personalInformation.lastName': 'Rivera' });
  student.accountStatus = 'inactive'; student.personalInformation.lastName = 'Rivera';
  assert.deepEqual(planBackfill(student, user), {});
  assert.deepEqual(planBackfill(student, null), {});
  assert.deepEqual(planBackfill(student, { ...user, role: 'faculty' }), {});
});
