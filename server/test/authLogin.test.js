const assert = require('node:assert/strict');
const test = require('node:test');
const bcrypt = require('bcryptjs');
const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const AdminUser = require('../models/AdminUser');
const FacultyUser = require('../models/FacultyUser');
const Student = require('../models/Student');
const SessionToken = require('../models/SessionToken');
const authRoutes = require('../routes/authRoutes');
const accountModels = { admin: AdminUser, faculty: FacultyUser, student: Student };
test.beforeEach(t => {
  t.mock.method(require('../models/SystemSettings'), 'findById', () => ({ lean: async () => null }));
});

test('faculty accounts default to the verified enrollment officer designation', () => {
  const faculty = new FacultyUser({
    username: 'faculty.user',
    passwordHash: 'password-hash',
    role: 'faculty'
  });
  assert.equal(faculty.role, 'faculty');
  assert.equal(faculty.designation, 'Verified enrollment officer');
});

const matchesQuery = (account, query) => {
  if (query.$or) return query.$or.some((condition) => matchesQuery(account, condition));
  return Object.entries(query).every(([key, value]) => account[key] === value);
};

const mockAccountCollections = (accounts, queries = []) => {
  for (const [role, AccountModel] of Object.entries(accountModels)) {
    AccountModel.findOne = async (query) => {
      queries.push(query);
      return accounts.find((account) => account.role === role && matchesQuery(account, query)) || null;
    };
  }
};

test('student login authenticates from the Student collection', async (t) => {
  const originalFindOnes = Object.fromEntries(
    Object.entries(accountModels).map(([role, AccountModel]) => [role, AccountModel.findOne])
  );
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

  mockAccountCollections([studentAccount], lookupQueries);
  SessionToken.create = async () => ({});
  process.env.JWT_SECRET = 'test-secret';

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    for (const [role, AccountModel] of Object.entries(accountModels)) {
      AccountModel.findOne = originalFindOnes[role];
    }
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
  assert.ok(lookupQueries.some((query) =>
    query.$or?.some((condition) => condition.email === '2021301234@student.buksu.edu.ph')
  ));

  studentAccount.email = '2021301234@faculty.buksu.edu.ph';
  const mismatchedAccountResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: '2021301234', password: 'student123' })
  });
  assert.equal(mismatchedAccountResponse.status, 403);
  const mismatchPayload = await mismatchedAccountResponse.json();
  assert.match(mismatchPayload.message, /@student\.buksu\.edu\.ph/);
});

test('login accepts legacy plain-text password hashes for existing accounts', async (t) => {
  const originalFindOnes = Object.fromEntries(
    Object.entries(accountModels).map(([role, AccountModel]) => [role, AccountModel.findOne])
  );
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

  mockAccountCollections([legacyUser], lookupQueries);
  SessionToken.create = async () => ({});
  process.env.JWT_SECRET = 'test-secret';

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    for (const [role, AccountModel] of Object.entries(accountModels)) {
      AccountModel.findOne = originalFindOnes[role];
    }
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
  assert.equal(payload.user.designation, 'Verified enrollment officer');
});

test('admin login resolves accounts from the admin users collection', async (t) => {
  const originalFindOnes = Object.fromEntries(
    Object.entries(accountModels).map(([role, AccountModel]) => [role, AccountModel.findOne])
  );
  const originalCreateSessionToken = SessionToken.create;
  const originalJwtSecret = process.env.JWT_SECRET;
  mockAccountCollections([{
    _id: 'admin-account-id',
    username: 'registrar',
    email: 'registrar@buksu.edu.ph',
    passwordHash: await bcrypt.hash('admin-password', 4),
    role: 'admin',
    accountStatus: 'active',
    save: async () => {}
  }]);
  SessionToken.create = async () => ({});
  process.env.JWT_SECRET = 'test-secret';

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    for (const [role, AccountModel] of Object.entries(accountModels)) {
      AccountModel.findOne = originalFindOnes[role];
    }
    SessionToken.create = originalCreateSessionToken;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  });

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'registrar', password: 'admin-password' })
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.role, 'admin');
});

test('login authenticates faculty by email and keeps legacy username fallback', async (t) => {
  const originalFindOnes = Object.fromEntries(
    Object.entries(accountModels).map(([role, AccountModel]) => [role, AccountModel.findOne])
  );
  const originalCreateSessionToken = SessionToken.create;
  const originalJwtSecret = process.env.JWT_SECRET;
  const passwordHash = await bcrypt.hash('correct-password', 4);
  const lookupQueries = [];
  const accounts = [
    {
      _id: 'faculty-id',
      username: 'faculty.cruz@faculty.buksu.edu.ph',
      email: 'faculty.cruz@faculty.buksu.edu.ph',
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

  mockAccountCollections(accounts, lookupQueries);
  SessionToken.create = async () => ({});
  process.env.JWT_SECRET = 'test-secret';

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    for (const [role, AccountModel] of Object.entries(accountModels)) {
      AccountModel.findOne = originalFindOnes[role];
    }
    SessionToken.create = originalCreateSessionToken;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/api/auth/login`;
  const facultyResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'FACULTY.CRUZ@FACULTY.BUKSU.EDU.PH', password: 'correct-password' })
  });
  assert.equal(facultyResponse.status, 200);
  const facultyPayload = await facultyResponse.json();
  assert.equal(facultyPayload.user.role, 'faculty');
  assert.equal(facultyPayload.user.employeeId, 'FAC-001');
  assert.ok(lookupQueries.some((query) => query.$or?.some(
    (condition) => condition.email === 'faculty.cruz@faculty.buksu.edu.ph'
  )));

  lookupQueries.length = 0;
  const wrongPasswordResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'faculty.cruz@faculty.buksu.edu.ph', password: 'wrong-password' })
  });
  assert.equal(wrongPasswordResponse.status, 401);
  assert.ok(lookupQueries.some((query) => query.$or?.some(
    (condition) => condition.email === 'faculty.cruz@faculty.buksu.edu.ph'
  )));

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
  assert.equal(legacyResponse.status, 401);
  assert.ok(lookupQueries.some((query) => query.$or?.some(
    (condition) => condition.email === '2021301234@buksu.edu.ph'
  )));
});

test('Google student sign-in creates an enrolled account from the verified identity', async (t) => {
  const originalFindOnes = Object.fromEntries(
    Object.entries(accountModels).map(([role, AccountModel]) => [role, AccountModel.findOne])
  );
  const originalStudentFindOne = Student.findOne;
  const originalStudentCreate = Student.create;
  const originalStudentDeleteOne = Student.deleteOne;
  const originalSessionTokenCreate = SessionToken.create;
  const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken;
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
  const originalJwtSecret = process.env.JWT_SECRET;
  const googlePayload = {
    sub: 'google-student-123',
    email: '2401110681@student.buksu.edu.ph',
    email_verified: true,
    iss: 'https://accounts.google.com',
    aud: 'test-google-client-id',
    exp: Math.floor(Date.now() / 1000) + 3600,
    hd: 'student.buksu.edu.ph',
    given_name: 'Mika',
    family_name: 'Santos',
    name: 'Mika Santos'
  };
  let createdStudent;

  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
  process.env.JWT_SECRET = 'test-secret';
  OAuth2Client.prototype.verifyIdToken = async () => ({ getPayload: () => googlePayload });
  mockAccountCollections([]);
  Student.findOne = async () => null;
  Student.create = async (fields) => {
    createdStudent = {
      ...fields,
      _id: 'google-student-user',
      personalInformation: { ...fields.personalInformation },
      classification: { ...fields.classification },
      enrollmentInformation: { ...fields.enrollmentInformation },
      academicStatus: {},
      save: async () => {}
    };
    return createdStudent;
  };
  Student.deleteOne = async () => ({ deletedCount: 1 });
  SessionToken.create = async () => ({});

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    for (const [role, AccountModel] of Object.entries(accountModels)) {
      AccountModel.findOne = originalFindOnes[role];
    }
    Student.findOne = originalStudentFindOne;
    Student.create = originalStudentCreate;
    Student.deleteOne = originalStudentDeleteOne;
    SessionToken.create = originalSessionTokenCreate;
    OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken;
    if (originalGoogleClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/api/auth/google`;
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: 'verified-test-credential' })
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.user.role, 'student');
  assert.equal(payload.user.studentNumber, '2401110681');
  assert.equal(payload.user.firstName, 'Mika');
  assert.equal(payload.user.lastName, 'Santos');
  assert.equal(createdStudent.username, '2401110681');
  assert.equal(createdStudent.email, googlePayload.email);
  assert.equal(createdStudent.institutionId, '2401110681');
  assert.equal(createdStudent.personalInformation.firstName, 'Mika');
  assert.equal(createdStudent.personalInformation.lastName, 'Santos');
  assert.equal(createdStudent.enrollmentStatus, 'enrolled');
  assert.ok(createdStudent.yearLevel >= 1 && createdStudent.yearLevel <= 4);
  assert.match(createdStudent.section, /^(BSIT|BSEMC|BSELEX|BSFT|BSAT)-[1-4][A-C]$/);
  assert.equal(createdStudent.classification.program, createdStudent.enrollmentInformation.course);

  googlePayload.email = '240111068@student.buksu.edu.ph';
  const invalidStudentIdResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: 'verified-test-credential' })
  });
  assert.equal(invalidStudentIdResponse.status, 403);
  assert.match((await invalidStudentIdResponse.json()).message, /10-digit ID/);
});

test('Google student sign-in links to existing student profile by institutionId and sets institutionalEmail', async (t) => {
  const originalFindOnes = Object.fromEntries(
    Object.entries(accountModels).map(([role, AccountModel]) => [role, AccountModel.findOne])
  );
  const originalStudentFindOne = Student.findOne;
  const originalSessionTokenCreate = SessionToken.create;
  const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken;
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
  const originalJwtSecret = process.env.JWT_SECRET;

  const existingStudent = {
    _id: 'existing-student-doc',
    institutionId: '2401105814',
    email: '2401105814@student.buksu.edu.ph',
    role: 'student',
    accountStatus: 'active',
    personalInformation: { firstName: 'Lawrence', lastName: 'Maureal' },
    contactInformation: {},
    save: async () => {}
  };

  const googlePayload = {
    sub: 'google-student-456',
    email: '2401105814@student.buksu.edu.ph',
    email_verified: true,
    iss: 'https://accounts.google.com',
    aud: 'test-google-client-id',
    exp: Math.floor(Date.now() / 1000) + 3600,
    hd: 'student.buksu.edu.ph',
    given_name: 'Lawrence',
    family_name: 'Maureal',
    name: 'Lawrence Maureal'
  };

  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
  process.env.JWT_SECRET = 'test-secret';
  OAuth2Client.prototype.verifyIdToken = async () => ({ getPayload: () => googlePayload });
  mockAccountCollections([existingStudent]);
  Student.findOne = async (query) => {
    if (query?.institutionId === '2401105814') return existingStudent;
    return null;
  };
  SessionToken.create = async () => ({});

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    for (const [role, AccountModel] of Object.entries(accountModels)) {
      AccountModel.findOne = originalFindOnes[role];
    }
    Student.findOne = originalStudentFindOne;
    SessionToken.create = originalSessionTokenCreate;
    OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken;
    if (originalGoogleClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/api/auth/google`;
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: 'verified-test-credential' })
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.user.role, 'student');
  assert.equal(payload.user.studentNumber, '2401105814');
  assert.equal(existingStudent.googleId, 'google-student-456');
  assert.equal(existingStudent.contactInformation.institutionalEmail, '2401105814@student.buksu.edu.ph');
});
