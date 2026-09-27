const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const SessionToken = require('../models/SessionToken');
const User = require('../models/User');
const authenticateToken = require('../middleware/authMiddleware');

const originalFindSession = SessionToken.findOne;
const originalFindUser = User.findById;
const originalJwtSecret = process.env.JWT_SECRET;

const queryReturning = (value) => ({
  select() {
    return this;
  },
  lean() {
    return Promise.resolve(value);
  }
});

const makeRequest = () => {
  const token = jwt.sign(
    {
      jti: 'test-session',
      userId: '507f1f77bcf86cd799439011',
      role: 'student',
      username: 'old-username'
    },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );

  return { headers: { authorization: `Bearer ${token}` } };
};

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

test.beforeEach(() => {
  process.env.JWT_SECRET = 'test-only-jwt-secret';
  SessionToken.findOne = () => queryReturning({ _id: 'session-id' });
});

test.afterEach(() => {
  SessionToken.findOne = originalFindSession;
  User.findById = originalFindUser;
});

test.after(() => {
  if (originalJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

test('allows an active account and refreshes mutable identity claims', async () => {
  User.findById = () => queryReturning({
    username: 'current-username',
    role: 'faculty',
    accountStatus: 'active'
  });
  const req = makeRequest();
  const res = makeResponse();
  let nextCalled = false;

  await authenticateToken(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user.role, 'faculty');
  assert.equal(req.user.username, 'current-username');
});

test('rejects an existing session after the account is suspended', async () => {
  User.findById = () => queryReturning({
    username: 'student-account',
    role: 'student',
    accountStatus: 'suspended'
  });
  const req = makeRequest();
  const res = makeResponse();
  let nextCalled = false;

  await authenticateToken(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { success: false, message: 'Account is not active' });
});

test('rejects a session when its account no longer exists', async () => {
  User.findById = () => queryReturning(null);
  const req = makeRequest();
  const res = makeResponse();

  await authenticateToken(req, res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { success: false, message: 'Account no longer exists' });
});
