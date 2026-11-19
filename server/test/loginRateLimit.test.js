const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const {
  checkLoginRateLimit,
  recordLoginFailure,
  clearLoginFailures,
  getLockoutStatus,
  resetRateLimits
} = require('../middleware/loginRateLimiter');

test.beforeEach(() => {
  resetRateLimits();
});

test('recordLoginFailure locks account after 5 consecutive failures for 2 minutes', async () => {
  const identifier = 'student.test';
  const ip = '192.168.1.50';

  // Attempts 1 to 4 should not lock
  for (let i = 1; i <= 4; i++) {
    const res = await recordLoginFailure(identifier, ip);
    assert.equal(res.locked, false, `Attempt ${i} should not lock`);
  }

  // 5th attempt should trigger 2-minute lockout
  const fifthAttempt = await recordLoginFailure(identifier, ip);
  assert.equal(fifthAttempt.locked, true, '5th attempt should lock account');
  assert.ok(fifthAttempt.retryAfterSeconds >= 118 && fifthAttempt.retryAfterSeconds <= 120, 'Retry-after should be approx 120s (2 min)');

  // Lockout status should report locked
  const status = getLockoutStatus(identifier, ip);
  assert.equal(status.locked, true);
  assert.equal(status.reason, 'account');
  assert.ok(status.retryAfterSeconds > 0);
});

test('checkLoginRateLimit middleware rejects locked user with 429 and Retry-After header', async () => {
  const app = express();
  app.use(express.json());
  app.post('/test-login', checkLoginRateLimit, (req, res) => {
    res.json({ success: true, message: 'Logged in' });
  });

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;

  try {
    const identifier = 'spammer.user';
    const ip = '127.0.0.1';

    // Simulate 5 failures
    for (let i = 0; i < 5; i++) {
      await recordLoginFailure(identifier, ip);
    }

    // Now try to hit /test-login
    const response = await fetch(`http://127.0.0.1:${port}/test-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: identifier })
    });

    assert.equal(response.status, 429, 'Locked user should receive HTTP 429');
    const retryHeader = response.headers.get('Retry-After');
    assert.ok(retryHeader, 'Should include Retry-After header');
    assert.ok(Number(retryHeader) > 0 && Number(retryHeader) <= 120);

    const body = await response.json();
    assert.equal(body.success, false);
    assert.equal(body.code, 'SPAM_LOGIN_DETECTED');
    assert.ok(body.message.includes('locked for 2 minutes'));
    assert.ok(body.retryAfterSeconds > 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('clearLoginFailures resets account failure counter on successful authentication', async () => {
  const identifier = 'legit.student';
  const ip = '10.0.0.1';

  // 4 failed attempts
  for (let i = 0; i < 4; i++) {
    await recordLoginFailure(identifier, ip);
  }

  // Account succeeds on 5th attempt
  clearLoginFailures(identifier, ip);

  // Status should be unlocked
  const status = getLockoutStatus(identifier, ip);
  assert.equal(status.locked, false);

  // Another single failure should be counted as 1, not 5 (no lockout)
  const afterReset = await recordLoginFailure(identifier, ip);
  assert.equal(afterReset.locked, false);
});

test('unrelated accounts from different IPs remain unaffected by single account lockout', async () => {
  const spammer = 'spam.bot';
  const legitUser = 'innocent.student';

  for (let i = 0; i < 5; i++) {
    await recordLoginFailure(spammer, '1.2.3.4');
  }

  const spammerStatus = getLockoutStatus(spammer, '1.2.3.4');
  assert.equal(spammerStatus.locked, true);

  const legitStatus = getLockoutStatus(legitUser, '5.6.7.8');
  assert.equal(legitStatus.locked, false);
});
