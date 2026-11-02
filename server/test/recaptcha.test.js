const assert = require('node:assert/strict');
const test = require('node:test');
const SystemSettings = require('../models/SystemSettings');
const verifyHuman = require('../middleware/recaptcha');

test('reCAPTCHA protects sign-in when enabled and reports missing server configuration', async (t) => {
  const originalEnvironment = {
    RECAPTCHA_SITE_KEY: process.env.RECAPTCHA_SITE_KEY,
    RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY,
    RECAPTCHA_ALLOWED_HOSTNAMES: process.env.RECAPTCHA_ALLOWED_HOSTNAMES
  };
  delete process.env.RECAPTCHA_SITE_KEY;
  delete process.env.RECAPTCHA_SECRET_KEY;
  delete process.env.RECAPTCHA_ALLOWED_HOSTNAMES;
  t.after(() => {
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  t.mock.method(SystemSettings, 'findById', () => ({
    lean: async () => ({ integrations: { recaptcha: { enabled: true } } })
  }));

  let continued = false;
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };

  await verifyHuman({ body: {} }, response, () => { continued = true; });

  assert.equal(response.statusCode, 503);
  assert.match(response.body.message, /RECAPTCHA_SITE_KEY/);
  assert.match(response.body.message, /server\/\.env/);
  assert.equal(continued, false);
});

test('reCAPTCHA does not block sign-in when disabled', async (t) => {
  t.mock.method(SystemSettings, 'findById', () => ({
    lean: async () => ({ integrations: { recaptcha: { enabled: false } } })
  }));

  let continued = false;
  await verifyHuman(
    { body: {} },
    { status() { return this; }, json() { return this; } },
    () => { continued = true; }
  );

  assert.equal(continued, true);
});

test('reCAPTCHA allows sign-in only after Google verifies the token for an allowed hostname', async (t) => {
  const originalEnvironment = {
    RECAPTCHA_SITE_KEY: process.env.RECAPTCHA_SITE_KEY,
    RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY,
    RECAPTCHA_ALLOWED_HOSTNAMES: process.env.RECAPTCHA_ALLOWED_HOSTNAMES
  };
  process.env.RECAPTCHA_SITE_KEY = 'test-site-key';
  process.env.RECAPTCHA_SECRET_KEY = 'test-secret-key';
  process.env.RECAPTCHA_ALLOWED_HOSTNAMES = 'localhost,example.edu';
  t.after(() => {
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  t.mock.method(SystemSettings, 'findById', () => ({
    lean: async () => ({ integrations: { recaptcha: { enabled: true } } })
  }));
  const fetch = t.mock.method(global, 'fetch', async () => ({
    ok: true,
    json: async () => ({ success: true, hostname: 'localhost' })
  }));

  let continued = false;
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };

  await verifyHuman(
    { body: { recaptchaToken: 'valid-test-token' } },
    response,
    () => { continued = true; }
  );

  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(response.statusCode, 200);
  assert.equal(continued, true);
});
