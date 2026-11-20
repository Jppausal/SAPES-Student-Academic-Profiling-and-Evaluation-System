const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/authMiddleware');

const originalJwtSecret = process.env.JWT_SECRET;

const makeRequest = (payload, options) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET, options);
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
});

test.after(() => {
  if (originalJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

test('authenticates a signed access token without database session or account lookups', () => {
  const req = makeRequest({
    tokenType: 'access',
    userId: '507f1f77bcf86cd799439011',
    role: 'faculty',
    username: 'faculty.user',
    departmentCode: 'IT',
    isVerifiedEnrollmentOfficer: true
  });
  const res = makeResponse();
  let nextCalled = false;

  authenticateToken(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user.role, 'faculty');
  assert.equal(req.user.departmentCode, 'IT');
  assert.equal(req.user.isVerifiedEnrollmentOfficer, true);
});

test('rejects password-reset JWTs as access tokens', () => {
  const req = makeRequest({
    tokenType: 'password_reset',
    purpose: 'password_reset',
    userId: '507f1f77bcf86cd799439011',
    role: 'student'
  }, { expiresIn: '5m' });
  const res = makeResponse();

  authenticateToken(req, res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { success: false, message: 'Invalid or expired token' });
});

test('rejects expired access tokens', () => {
  const req = makeRequest({
    tokenType: 'access',
    userId: '507f1f77bcf86cd799439011',
    role: 'student'
  }, { expiresIn: '-1s' });
  const res = makeResponse();

  authenticateToken(req, res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { success: false, message: 'Invalid or expired token' });
});

test('rejects pre-stateless tokens so users must sign in to receive the new claims', () => {
  const req = makeRequest({
    userId: '507f1f77bcf86cd799439011',
    role: 'student',
    jti: 'old-session-id'
  });
  const res = makeResponse();

  authenticateToken(req, res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 401);
});

test('rejects access tokens with missing or unsupported identity claims', () => {
  const req = makeRequest({
    tokenType: 'access',
    userId: '507f1f77bcf86cd799439011',
    role: 'superuser'
  });
  const res = makeResponse();

  authenticateToken(req, res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 401);
});
