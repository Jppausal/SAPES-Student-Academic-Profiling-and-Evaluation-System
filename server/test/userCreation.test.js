const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');
const FacultyUser = require('../models/FacultyUser');
const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');
const SessionToken = require('../models/SessionToken');
const RolePermission = require('../models/RolePermission');
const userRoutes = require('../routes/userRoutes');

const accountModels = { admin: AdminUser, faculty: FacultyUser, student: Student };
const query = value => {
  const result = Promise.resolve(value);
  result.select = () => result;
  result.lean = async () => value;
  return result;
};

async function fixture(t, role = 'admin') {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'role-account-creation-test-secret';
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const admin = {
    _id: '507f1f77bcf86cd799439010',
    username: 'authorized.admin',
    role: 'admin',
    accountStatus: 'active'
  };
  const faculty = {
    _id: '507f1f77bcf86cd799439020',
    username: 'authorized.faculty',
    role: 'faculty',
    accountStatus: 'active'
  };
  const accounts = { admin, faculty };
  for (const [accountRole, Model] of Object.entries(accountModels)) {
    t.mock.method(Model, 'findById', id => query(
      accountRole === role && accounts[accountRole]?._id === String(id)
        ? accounts[accountRole]
        : null
    ));
    t.mock.method(Model, 'findOne', async () => null);
  }
  const created = { admin: [], faculty: [], student: [] };
  for (const [accountRole, Model] of Object.entries(accountModels)) {
    t.mock.method(Model, 'create', async data => {
      const account = {
        _id: `created-${accountRole}-${created[accountRole].length + 1}`,
        createdAt: new Date(),
        ...data
      };
      created[accountRole].push(account);
      return account;
    });
    t.mock.method(Model, 'deleteOne', async () => ({ deletedCount: 1 }));
  }
  t.mock.method(SessionToken, 'findOne', () => query({ _id: 'session-id' }));
  t.mock.method(RolePermission, 'findOne', () => query(null));
  const auditLogs = [];
  t.mock.method(AuditLog, 'create', async event => { auditLogs.push(event); return event; });

  const app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const token = jwt.sign({
    jti: 'session-jti',
    userId: accounts[role]._id,
    role,
    username: accounts[role].username
  }, process.env.JWT_SECRET);
  const endpoint = `http://127.0.0.1:${server.address().port}/api/users`;
  const createAccount = body => fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { created, auditLogs, endpoint, createAccount };
}

test('authorized admins create accounts only in each role-specific collection', async t => {
  const { created, auditLogs, createAccount } = await fixture(t);

  const studentResponse = await createAccount({
    password: 'temporary-password',
    role: 'student',
    firstName: 'Alex',
    lastName: 'Rivera',
    accountStatus: 'inactive',
    email: '  2401105814@STUDENT.BUKSU.EDU.PH  '
  });
  assert.equal(studentResponse.status, 201);
  assert.equal(created.student[0].username, '2401105814');
  assert.equal(created.student[0].institutionId, '2401105814');
  assert.equal(created.student[0].email, '2401105814@student.buksu.edu.ph');
  assert.equal(created.student[0].accountStatus, 'inactive');
  assert.deepEqual(created.student[0].personalInformation, { firstName: 'Alex', lastName: 'Rivera' });
  assert.equal(created.student[0].contactInformation.institutionalEmail, created.student[0].email);
  assert.equal(Object.hasOwn(created.student[0], 'userId'), false);

  const facultyResponse = await createAccount({
    username: 'faculty.test',
    password: 'temporary-password',
    role: 'faculty',
    firstName: 'Faculty',
    lastName: 'Member',
    email: 'faculty.test@faculty.buksu.edu.ph',
    employeeId: 'FAC-001',
    accountStatus: 'inactive'
  });
  assert.equal(facultyResponse.status, 201);
  assert.equal(created.faculty[0].accountStatus, 'inactive');

  const adminResponse = await createAccount({
    username: 'registrar.test',
    password: 'temporary-password',
    role: 'admin',
    firstName: 'Registrar',
    lastName: 'Administrator',
    email: 'registrar.test@buksu.edu.ph'
  });
  assert.equal(adminResponse.status, 201);

  assert.deepEqual(
    Object.fromEntries(Object.entries(created).map(([role, users]) => [role, users.length])),
    { admin: 1, faculty: 1, student: 1 }
  );
  assert.equal(auditLogs.length, 3);
  assert.ok(auditLogs.every(event => event.action === 'USER_CREATED'));
});

test('account creation rejects missing authorization, mismatched student identity, and non-admin roles', async t => {
  const adminFixture = await fixture(t);
  const unauthenticated = await fetch(adminFixture.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(unauthenticated.status, 401);

  const mismatch = await adminFixture.createAccount({
    username: '2401109999',
    password: 'temporary-password',
    role: 'student',
    firstName: 'Test',
    lastName: 'Student',
    studentNumber: '2401109999',
    email: '2401105814@student.buksu.edu.ph'
  });
  assert.equal(mismatch.status, 400);
  assert.match((await mismatch.json()).message, /must match/);

  const facultyFixture = await fixture(t, 'faculty');
  const forbidden = await facultyFixture.createAccount({
    username: 'unauthorized.creator',
    password: 'temporary-password',
    role: 'faculty',
    firstName: 'Unauthorized',
    lastName: 'Creator',
    email: 'unauthorized.creator@faculty.buksu.edu.ph'
  });
  assert.equal(forbidden.status, 403);
});
