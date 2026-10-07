const assert = require('node:assert/strict');
const test = require('node:test');
const bcrypt = require('bcryptjs');
const express = require('express');
const User = require('../models/User');
const Student = require('../models/Student');
const SessionToken = require('../models/SessionToken');
const authRoutes = require('../routes/authRoutes');

test('student login authenticates from the Student collection', async (t) => {
  const originalUserFindOne = User.findOne;
  const originalStudentFindOne = Student.findOne;
  const originalCreateSessionToken = SessionToken.create;
  const originalJwtSecret = process.env.JWT_SECRET;
  const studentAccount = {
    _id: 'student-doc-id',
    institutionId: '2021301234',
    username: 'juandelacruz',
    email: '2021301234@student.buksu.edu.ph',
    passwordHash: await bcrypt.hash('student123', 4),
    accountStatus: 'active',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    role: 'student',
    save: async () => {}
  };
  const lookupQueries = [];

  User.findOne = async () => null;
  Student.findOne = async (query) => {
    lookupQueries.push(query);
    return Object.entries(query).every(([key, value]) => {
      if (key === '$or') return true;
      return studentAccount[key] === value;
    }) ? studentAccount : null;
  };
  SessionToken.create = async () => ({});
  process.env.JWT_SECRET = 'test-secret';

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    User.findOne = originalUserFindOne;
    Student.findOne = originalStudentFindOne;
    SessionToken.create = originalCreateSessionToken;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/api/auth/login`;
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: '2021301234@student.buksu.edu.ph', password: 'student123' })
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.user.role, 'student');
  assert.equal(payload.user.studentNumber, '2021301234');
  assert.ok(lookupQueries[0].$or.some((condition) => condition.email === '2021301234@student.buksu.edu.ph'));
});

test('login accepts legacy plain-text password hashes for existing local accounts', async (t) => {
  const originalFindOne = User.findOne;
  const originalStudentFindOne = Student.findOne;
  const originalCreateSessionToken = SessionToken.create;
  const originalJwtSecret = process.env.JWT_SECRET;
  const lookupQueries = [];
  const legacyUser = {
    _id: 'legacy-faculty-id',
    username: 'Santos01',
    email: 'santos@faculty.buksu.edu.ph',
    firstName: 'Kurt',
    lastName: 'Santos',
    employeeId: '2345678901',
    passwordHash: 'faculty123',
    role: 'faculty',
    accountStatus: 'active',
    save: async () => {}
  };

  User.findOne = async (query) => {
    lookupQueries.push(query);
    return Object.entries(query).every(([key, value]) => legacyUser[key] === value)
      ? legacyUser
      : null;
  };
  Student.findOne = async () => null;
  SessionToken.create = async () => ({});
  process.env.JWT_SECRET = 'test-secret';

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    User.findOne = originalFindOne;
    Student.findOne = originalStudentFindOne;
    SessionToken.create = originalCreateSessionToken;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/api/auth/login`;
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'santos@faculty.buksu.edu.ph', password: 'faculty123' })
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.user.role, 'faculty');
  assert.equal(payload.user.employeeId, '2345678901');
});

test('login authenticates faculty by email and keeps legacy username fallback', async (t) => {
  const originalFindOne = User.findOne;
  const originalStudentFindOne = Student.findOne;
  const originalCreateSessionToken = SessionToken.create;
  const originalJwtSecret = process.env.JWT_SECRET;
  const passwordHash = await bcrypt.hash('correct-password', 4);
  const lookupQueries = [];
  const accounts = [
    {
      _id: 'faculty-id',
      username: 'faculty.cruz@buksu.edu.ph',
      email: 'faculty.cruz@buksu.edu.ph',
      firstName: 'Maria',
      lastName: 'Cruz',
      employeeId: 'FAC-001',
      passwordHash,
      role: 'faculty',
      accountStatus: 'active',
      save: async () => {}
    },
    {
      _id: 'student-id',
      username: '2021301234',
      email: '2021301234@student.buksu.edu.ph',
      passwordHash,
      role: 'student',
      accountStatus: 'active',
      studentNumber: '2021301234',
      save: async () => {}
    }
  ];

  User.findOne = async (query) => {
    lookupQueries.push(query);
    return accounts.find((account) =>
      Object.entries(query).every(([key, value]) => account[key] === value)
    ) || null;
  };
  Student.findOne = async () => null;
  SessionToken.create = async () => ({});
  process.env.JWT_SECRET = 'test-secret';

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    User.findOne = originalFindOne;
    Student.findOne = originalStudentFindOne;
    SessionToken.create = originalCreateSessionToken;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/api/auth/login`;
  const facultyResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'FACULTY.CRUZ@BUKSU.EDU.PH', password: 'correct-password' })
  });
  assert.equal(facultyResponse.status, 200);
  const facultyPayload = await facultyResponse.json();
  assert.equal(facultyPayload.user.role, 'faculty');
  assert.equal(facultyPayload.user.employeeId, 'FAC-001');
  assert.deepEqual(lookupQueries, [{ email: 'faculty.cruz@buksu.edu.ph' }]);

  lookupQueries.length = 0;
  const wrongPasswordResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'faculty.cruz@buksu.edu.ph', password: 'wrong-password' })
  });
  assert.equal(wrongPasswordResponse.status, 401);
  assert.deepEqual(lookupQueries, [{ email: 'faculty.cruz@buksu.edu.ph' }]);

  lookupQueries.length = 0;
  const unknownEmailResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'missing@buksu.edu.ph', password: 'correct-password' })
  });
  assert.equal(unknownEmailResponse.status, 401);

  lookupQueries.length = 0;
  const legacyResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: '2021301234@buksu.edu.ph', password: 'correct-password' })
  });
  assert.equal(legacyResponse.status, 200);
  assert.deepEqual(lookupQueries, [
    { email: '2021301234@buksu.edu.ph' },
    { username: '2021301234@buksu.edu.ph' },
    { username: '2021301234' }
  ]);
});