const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const {
  createGlobalRateLimiter
} = require('../middleware/globalRateLimiter');

test('global rate limiter returns a clear 429 response after the limit is exceeded', async (t) => {
  const app = express();
  app.use(createGlobalRateLimiter({ windowMs: 60 * 1000, limit: 2 }));
  app.get('/test', (_req, res) => res.json({ success: true }));

  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  assert.equal((await fetch(`${baseUrl}/test`)).status, 200);
  assert.equal((await fetch(`${baseUrl}/test`)).status, 200);

  const limitedResponse = await fetch(`${baseUrl}/test`);
  assert.equal(limitedResponse.status, 429);
  assert.ok(limitedResponse.headers.get('retry-after'));

  const body = await limitedResponse.json();
  assert.equal(body.success, false);
  assert.equal(body.message, 'Too many requests. Please wait and try again.');
  assert.ok(body.retryAfterSeconds >= 1);
});

test('health checks do not consume the default limit and normal startup traffic is allowed', async (t) => {
  const app = express();
  app.use(createGlobalRateLimiter());
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/test', (_req, res) => res.json({ success: true }));

  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  for (let request = 0; request < 25; request++) {
    assert.equal((await fetch(`${baseUrl}/api/health`)).status, 200);
  }
  for (let request = 0; request < 20; request++) {
    assert.equal((await fetch(`${baseUrl}/api/test`)).status, 200);
  }
  assert.equal((await fetch(`${baseUrl}/api/test`)).status, 429);
});
