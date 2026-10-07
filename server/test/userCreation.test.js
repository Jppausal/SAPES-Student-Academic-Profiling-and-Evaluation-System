const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');
const SessionToken = require('../models/SessionToken');
const RolePermission = require('../models/RolePermission');
const userRoutes = require('../routes/userRoutes');

const chainResult = (value) => ({
  select() { return this; },
  lean: async () => value
});

test('A103 lets an authorized admin create student, faculty, and admin accounts', async (t) => {
  const originals = {
    userFindById: User.findById,
    userExists: User.exists,
    userCreate: User.create,
    studentFindById: Student.findById,
    studentExists: Student.exists,
    studentCreate: Student.create,
    sessionFindOne: SessionToken.findOne,
    permissionFindOne: RolePermission.findOne,
    auditCreate: AuditLog.create,
    jwtSecret: process.env.JWT_SECRET
  };
  const createdUsers = [];
  const createdStudents = [];
  const auditLogs = [];

  process.env.JWT_SECRET = 'a103-test-secret';
  User.findById = () => chainResult({
    _id: 'admin-user-id',
    username: 'authorized.admin',
    role: 'admin',
    accountStatus: 'active'
  });
  Student.findById = () => chainResult(null);
  SessionToken.findOne = () => chainResult({ _id: 'session-id' });
  RolePermission.findOne = () => ({ lean: async () => null });
  User.exists = async () => false;
  Student.exists = async () => false;
  User.create = async (data) => {
    const user = {
      _id: `created-user-${createdUsers.length + 1}`,
      accountStatus: 'active',
      createdAt: new Date(),
      ...data
    };
    createdUsers.push(user);
    return user;
  };
  Student.create = async (data) => {
    createdStudents.push(data);
    return data;
  };
  AuditLog.create = async (data) => {
    auditLogs.push(data);
    return data;
  };

  const app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    User.findById = originals.userFindById;
    User.exists = originals.userExists;
    User.create = originals.userCreate;
    Student.findById = originals.studentFindById;
    Student.exists = originals.studentExists;
    Student.create = originals.studentCreate;
    SessionToken.findOne = originals.sessionFindOne;
    RolePermission.findOne = originals.permissionFindOne;
    AuditLog.create = originals.auditCreate;
    if (originals.jwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originals.jwtSecret;
  });

  const address = server.address();
  const endpoint = `http://127.0.0.1:${address.port}/api/users`;
  const token = jwt.sign(
    { jti: 'session-jti', userId: 'admin-user-id', role: 'admin', username: 'authorized.admin' },
    process.env.JWT_SECRET
  );
  const createAccount = (body) => fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const studentResponse = await createAccount({
    password: 'temporary-password',
    role: 'student',
    firstName: 'Alex',
    lastName: 'Rivera',
    email: '  2401105814@STUDENT.BUKSU.EDU.PH  ',
    department: 'College of Technologies'
  });
  assert.equal(studentResponse.status, 201);
  assert.equal(createdUsers[0].username, '2401105814');
  assert.equal(createdUsers[0].studentNumber, '2401105814');
  assert.equal(createdUsers[0].email, '2401105814@student.buksu.edu.ph');
  assert.equal(createdStudents[0].institutionId, '2401105814');
  assert.equal(
    createdStudents[0].contactInformation.institutionalEmail,
    '2401105814@student.buksu.edu.ph'
  );
  assert.equal(createdStudents[0].classification, undefined);

  const facultyResponse = await createAccount({
    username: 'faculty.test',
    password: 'temporary-password',
    role: 'faculty',
    firstName: 'Faculty',
    lastName: 'Member',
    email: 'faculty.test@buksu.edu.ph',
    employeeId: 'FAC-001',
    accountStatus: 'inactive'
  });
  assert.equal(facultyResponse.status, 201);
  assert.equal(createdUsers[1].accountStatus, 'inactive');

  const adminResponse = await createAccount({
    username: 'registrar.test',
    password: 'temporary-password',
    role: 'admin',
    firstName: 'Registrar',
    lastName: 'Administrator',
    email: 'registrar.test@buksu.edu.ph'
  });
  assert.equal(adminResponse.status, 201);

  assert.deepEqual(createdUsers.map((user) => user.role), ['student', 'faculty', 'admin']);
  assert.equal(createdStudents.length, 1);
  assert.equal(auditLogs.length, 3);
  assert.ok(auditLogs.every((entry) => entry.action === 'USER_CREATED'));
});

test('A103 rejects unauthenticated creation and mismatched student identity', async (t) => {
  const originals = {
    userFindById: User.findById,
    studentFindById: Student.findById,
    sessionFindOne: SessionToken.findOne,
    permissionFindOne: RolePermission.findOne,
    jwtSecret: process.env.JWT_SECRET
  };
  process.env.JWT_SECRET = 'a103-rejection-test-secret';
  let authenticatedRole = 'admin';
  User.findById = () => chainResult({
    _id: 'admin-user-id', username: 'admin', role: authenticatedRole, accountStatus: 'active'
  });
  Student.findById = () => chainResult(null);
  SessionToken.findOne = () => chainResult({ _id: 'session-id' });
  RolePermission.findOne = () => ({ lean: async () => null });

  const app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    User.findById = originals.userFindById;
    Student.findById = originals.studentFindById;
    SessionToken.findOne = originals.sessionFindOne;
    RolePermission.findOne = originals.permissionFindOne;
    if (originals.jwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originals.jwtSecret;
  });

  const address = server.address();
  const endpoint = `http://127.0.0.1:${address.port}/api/users`;
  const unauthenticatedResponse = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(unauthenticatedResponse.status, 401);

  const token = jwt.sign(
    { jti: 'session-jti', userId: 'admin-user-id', role: 'admin' },
    process.env.JWT_SECRET
  );
  const mismatchResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: '2401109999',
      studentNumber: '2401109999',
      password: 'temporary-password',
      role: 'student',
      firstName: 'Test',
      lastName: 'Student',
      email: '2401105814@student.buksu.edu.ph'
    })
  });
  assert.equal(mismatchResponse.status, 400);
  const mismatchPayload = await mismatchResponse.json();
  assert.match(mismatchPayload.message, /must match/);

  authenticatedRole = 'faculty';
  const facultyResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'unauthorized.creator',
      password: 'temporary-password',
      role: 'faculty',
      firstName: 'Unauthorized',
      lastName: 'Creator',
      email: 'unauthorized.creator@buksu.edu.ph'
    })
  });
  assert.equal(facultyResponse.status, 403);
});
