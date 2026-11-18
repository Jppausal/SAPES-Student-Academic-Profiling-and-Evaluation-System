const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createRateLimiter } = require('../middleware/rateLimiters');

test('rate limiter rejects requests over its limit with a JSON 429 and standard headers', async (t) => {
  const app = express();
  app.use(createRateLimiter(1));
  app.get('/', (_req, res) => res.json({ success: true }));

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => {
    if (server.closeAllConnections) server.closeAllConnections();
    server.close(resolve);
  }));

  const url = `http://127.0.0.1:${server.address().port}/`;
  assert.equal((await fetch(url)).status, 200);

  const limitedResponse = await fetch(url);
  assert.equal(limitedResponse.status, 429);
  assert.ok(
    limitedResponse.headers.has('ratelimit-policy')
    || limitedResponse.headers.has('ratelimit-limit')
  );
  assert.deepEqual(await limitedResponse.json(), {
    success: false,
    message: 'Too many requests. Please try again later.'
  });
});
