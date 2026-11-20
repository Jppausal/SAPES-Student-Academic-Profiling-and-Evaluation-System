const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const {
  createTransactionRateLimiter,
  resetAllTransactionRateLimits
} = require('../middleware/transactionRateLimiter');
const AuditLog = require('../models/AuditLog');

test.beforeEach(() => {
  resetAllTransactionRateLimits();
});

test('createTransactionRateLimiter allows requests up to max and sets rate limit headers', async (t) => {
  const app = express();
  app.use(express.json());

  const testLimiter = createTransactionRateLimiter({
    name: 'UNIT_TEST_TRANSACTION',
    windowMs: 60 * 1000,
    max: 3,
    auditOnLimit: false
  });

  app.post('/test-action', testLimiter, (req, res) => {
    res.json({ success: true, count: req.body?.count });
  });

  const server = app.listen(0);
  t.after(() => server.close());
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  // Requests 1, 2, 3 should succeed
  for (let i = 1; i <= 3; i++) {
    const res = await fetch(`${baseUrl}/test-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: i })
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-ratelimit-limit'), '3');
    assert.equal(res.headers.get('x-ratelimit-remaining'), String(3 - i));
    const data = await res.json();
    assert.equal(data.success, true);
  }

  // Request 4 should be blocked with 429
  const blockedRes = await fetch(`${baseUrl}/test-action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count: 4 })
  });

  assert.equal(blockedRes.status, 429);
  assert.equal(blockedRes.headers.get('x-ratelimit-remaining'), '0');
  assert.ok(Number(blockedRes.headers.get('retry-after')) > 0);

  const blockedBody = await blockedRes.json();
  assert.equal(blockedBody.success, false);
  assert.equal(blockedBody.code, 'RATE_LIMIT_EXCEEDED');
  assert.ok(blockedBody.retryAfterSeconds > 0);
  assert.match(blockedBody.message, /Too many requests/);
});

test('Rate limiter unlocks after lockout period expires', async (t) => {
  const testLimiter = createTransactionRateLimiter({
    name: 'EXPIRY_TEST',
    windowMs: 50,
    max: 1,
    lockoutMs: 50,
    auditOnLimit: false
  });

  const app = express();
  app.post('/expiry-action', testLimiter, (_req, res) => res.json({ success: true }));

  const server = app.listen(0);
  t.after(() => server.close());
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  // 1st request succeeds
  const res1 = await fetch(`${baseUrl}/expiry-action`, { method: 'POST' });
  assert.equal(res1.status, 200);

  // 2nd immediate request fails
  const res2 = await fetch(`${baseUrl}/expiry-action`, { method: 'POST' });
  assert.equal(res2.status, 429);

  // Wait for lockout to expire
  await new Promise((resolve) => setTimeout(resolve, 60));

  // 3rd request succeeds after lockout expires
  const res3 = await fetch(`${baseUrl}/expiry-action`, { method: 'POST' });
  assert.equal(res3.status, 200);
});

test('Records audit log when rate limit is exceeded', async (t) => {
  const auditEntries = [];
  t.mock.method(AuditLog, 'create', async (doc) => {
    auditEntries.push(doc);
    return doc;
  });

  const auditLimiter = createTransactionRateLimiter({
    name: 'SENSITIVE_TX',
    windowMs: 60 * 1000,
    max: 1,
    lockoutMs: 60 * 1000,
    auditOnLimit: true
  });

  const app = express();
  // Simulate an authenticated user
  app.use((req, _res, next) => {
    req.user = { userId: '507f1f77bcf86cd799439011', role: 'faculty' };
    next();
  });
  app.post('/sensitive-tx', auditLimiter, (_req, res) => res.json({ success: true }));

  const server = app.listen(0);
  t.after(() => server.close());
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  // Request 1 passes
  const res1 = await fetch(`${baseUrl}/sensitive-tx`, { method: 'POST' });
  assert.equal(res1.status, 200);

  // Request 2 blocked with 429
  const res2 = await fetch(`${baseUrl}/sensitive-tx`, { method: 'POST' });
  assert.equal(res2.status, 429);

  // Check that audit entry was recorded
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].action, 'TRANSACTION_RATE_LIMITED');
  assert.equal(auditEntries[0].userRole, 'faculty');
  assert.equal(auditEntries[0].details.transaction, 'SENSITIVE_TX');
});

test('resetAllTransactionRateLimits clears active stores', async (t) => {
  const limiter = createTransactionRateLimiter({
    name: 'RESET_TEST',
    windowMs: 60 * 1000,
    max: 1,
    auditOnLimit: false
  });

  const app = express();
  app.post('/reset-test', limiter, (_req, res) => res.json({ success: true }));

  const server = app.listen(0);
  t.after(() => server.close());
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  // 1st request succeeds
  const res1 = await fetch(`${baseUrl}/reset-test`, { method: 'POST' });
  assert.equal(res1.status, 200);

  // 2nd request is blocked
  const res2 = await fetch(`${baseUrl}/reset-test`, { method: 'POST' });
  assert.equal(res2.status, 429);

  // Reset all stores
  resetAllTransactionRateLimits();

  // 3rd request succeeds immediately after reset
  const res3 = await fetch(`${baseUrl}/reset-test`, { method: 'POST' });
  assert.equal(res3.status, 200);
});
