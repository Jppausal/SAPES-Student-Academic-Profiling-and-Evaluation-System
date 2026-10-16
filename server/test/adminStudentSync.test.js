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

const query = value => {
  const result = Promise.resolve(value);
  result.select = () => result;
  result.lean = async () => value;
  return result;
};

async function fixture(t) {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'role-collection-test-only';
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const admin = {
    _id: '507f1f77bcf86cd799439010',
    username: 'test.admin',
    role: 'admin',
    accountStatus: 'active',
    save: async () => {}
  };
  const faculty = {
    _id: '507f1f77bcf86cd799439011',
    username: 'test.faculty',
    role: 'faculty',
    accountStatus: 'active',
    save: async () => {}
  };
  const student = {
    _id: '507f1f77bcf86cd799439012',
    username: '9900000101',
    institutionId: '9900000101',
    role: 'student',
    accountStatus: 'active',
    personalInformation: { firstName: 'Alex', middleName: 'Keep', lastName: 'Rivera', suffix: 'Jr.' },
    save: async () => {}
  };
  const accounts = [admin, faculty, student];
  for (const [role, Model] of Object.entries({ admin: AdminUser, faculty: FacultyUser, student: Student })) {
    t.mock.method(Model, 'findById', id => query(
      accounts.find(account => account.role === role && account._id === String(id)) || null
    ));
  }
  t.mock.method(Student, 'findOne', filter => query(
    filter.institutionId === student.institutionId ? student : null
  ));
  t.mock.method(SessionToken, 'findOne', () => query({ _id: 'session' }));
  const revokedSessions = t.mock.method(SessionToken, 'updateMany', async () => ({}));
  t.mock.method(RolePermission, 'findOne', () => query(null));
  const audits = [];
  t.mock.method(AuditLog, 'create', async event => { audits.push(event); return event; });

  const app = express();
  app.use(express.json());
  app.use('/users', require('../routes/userRoutes'));
  app.use('/students', require('../routes/studentRoutes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const token = jwt.sign({ userId: admin._id, role: 'admin', jti: 'test-session' }, process.env.JWT_SECRET);
  const put = (path, body) => fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { admin, faculty, student, put, revokedSessions, audits };
}

test('account status changes target the selected role collection only', async t => {
  const { admin, faculty, student, put, revokedSessions } = await fixture(t);
  const profileBefore = JSON.stringify(student.personalInformation);

  assert.equal((await put(`/users/${faculty._id}/status?role=faculty`, { accountStatus: 'inactive' })).status, 200);
  assert.equal(faculty.accountStatus, 'inactive');
  assert.equal(student.accountStatus, 'active');

  assert.equal((await put(`/users/${student._id}/status?role=student`, { accountStatus: 'suspended' })).status, 200);
  assert.equal(student.accountStatus, 'suspended');
  assert.equal(JSON.stringify(student.personalInformation), profileBefore);

  assert.equal((await put(`/users/${admin._id}/status?role=admin`, { accountStatus: 'inactive' })).status, 400);
  assert.equal(admin.accountStatus, 'active');
  assert.equal(revokedSessions.mock.callCount(), 2);
});

test('admin student profile changes update the account/profile document in student users', async t => {
  const { student, put, audits } = await fixture(t);
  const response = await put(`/students/${student.institutionId}`, {
    personalInformation: { firstName: 'Renamed', middleName: 'Middle', suffix: 'III' }
  });

  assert.equal(response.status, 200);
  assert.equal(student.personalInformation.firstName, 'Renamed');
  assert.equal(student.personalInformation.lastName, 'Rivera');
  assert.equal(student.personalInformation.middleName, 'Middle');
  assert.equal(student.personalInformation.suffix, 'III');
  assert.equal(Object.hasOwn(student, 'userId'), false);
  assert.equal(audits[0].action, 'UPDATE_STUDENT_PROFILE');
});
