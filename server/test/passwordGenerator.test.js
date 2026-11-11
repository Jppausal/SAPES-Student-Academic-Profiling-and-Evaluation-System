const test = require('node:test');
const assert = require('node:assert/strict');
const { generatePassword, generateSecureLocalPassword } = require('../utils/passwordGenerator');
const SystemSettings = require('../models/SystemSettings');

test('generateSecureLocalPassword generates random passwords satisfying complexity requirements', () => {
  const pwd12 = generateSecureLocalPassword(12);
  assert.equal(pwd12.length, 12);
  assert.match(pwd12, /[A-Z]/);
  assert.match(pwd12, /[a-z]/);
  assert.match(pwd12, /[0-9]/);
  assert.match(pwd12, /[!@#$%&*]/);

  const pwd16 = generateSecureLocalPassword(16);
  assert.equal(pwd16.length, 16);
});

test('generatePassword falls back to secure local generation when API key is missing', async t => {
  const env = process.env.API_NINJAS_API_KEY;
  delete process.env.API_NINJAS_API_KEY;
  delete process.env.API_NINJAS_KEY;
  t.after(() => {
    if (env !== undefined) process.env.API_NINJAS_API_KEY = env;
  });

  t.mock.method(SystemSettings, 'findById', () => ({
    lean: async () => ({
      integrations: { passwordGenerator: { enabled: true } }
    })
  }));

  const res = await generatePassword({ length: 14 });
  assert.equal(res.source, 'fallback');
  assert.equal(res.password.length, 14);
  assert.ok(res.message.includes('API_NINJAS_API_KEY is not configured'));
});

test('generatePassword rejects when integration is disabled in settings', async t => {
  t.mock.method(SystemSettings, 'findById', () => ({
    lean: async () => ({
      integrations: { passwordGenerator: { enabled: false } }
    })
  }));

  await assert.rejects(
    () => generatePassword({ length: 12 }),
    err => {
      assert.equal(err.status, 403);
      assert.match(err.message, /disabled in App Settings/);
      return true;
    }
  );
});

test('generatePassword successfully calls API Ninjas when key is configured', async t => {
  process.env.API_NINJAS_API_KEY = 'test-ninjas-key';
  t.after(() => {
    delete process.env.API_NINJAS_API_KEY;
  });

  t.mock.method(SystemSettings, 'findById', () => ({
    lean: async () => ({
      integrations: { passwordGenerator: { enabled: true } }
    })
  }));

  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    assert.ok(url.includes('api.api-ninjas.com/v1/passwordgenerator'));
    assert.equal(options.headers['X-Api-Key'], 'test-ninjas-key');
    return {
      ok: true,
      status: 200,
      json: async () => ({ random_password: 'Generated#NinjaPass99!' })
    };
  };
  t.after(() => {
    global.fetch = originalFetch;
  });

  const res = await generatePassword({ length: 12 });
  assert.equal(res.source, 'api-ninjas');
  assert.equal(res.password, 'Generated#NinjaPass99!');
  assert.ok(res.message.includes('API Ninjas Password Generator'));
});
