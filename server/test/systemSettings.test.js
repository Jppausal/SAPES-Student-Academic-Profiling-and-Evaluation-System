const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Settings = require('../models/SystemSettings');
const Session = require('../models/SessionToken');
const Permissions = require('../models/RolePermission');
const Audit = require('../models/AuditLog');
const models = { admin: require('../models/AdminUser'), faculty: require('../models/FacultyUser'), student: require('../models/Student') };
const query = value => ({ ...value, select() { return this; }, lean: async () => value, then(r) { return Promise.resolve(value).then(r); } });
async function fixture(t) {
  const env = { ...process.env };
  Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: 'settings-test', GOOGLE_CLIENT_ID: 'test-client', SMTP_HOST: 'test-host', SMTP_FROM: 'test@example.invalid', SMTP_USER: 'test', SMTP_PASSWORD: 'secret-canary' });
  t.after(() => { for (const key of ['NODE_ENV','JWT_SECRET','GOOGLE_CLIENT_ID','SMTP_HOST','SMTP_FROM','SMTP_USER','SMTP_PASSWORD']) { if (env[key] === undefined) delete process.env[key]; else process.env[key] = env[key]; } });
  const state = { integrations: { googleAuth: { enabled: true }, smtp: { enabled: true }, recaptcha: { enabled: false } } };
  t.mock.method(Settings, 'findById', () => query(state));
  t.mock.method(Settings, 'findOneAndUpdate', async (_filter, update) => {
    const before = structuredClone(state);
    for (const [key, value] of Object.entries(update.$set || {})) {
      if (key.startsWith('integrations.')) {
        const parts = key.split('.');
        if (parts.length === 3) {
          state.integrations[parts[1]] = state.integrations[parts[1]] || {};
          state.integrations[parts[1]][parts[2]] = value;
        }
      }
    }
    return before;
  });
  const audit = t.mock.method(Audit, 'create', async value => value);
  let permissions = ['manage_users'];
  t.mock.method(Permissions, 'findOne', () => query({ permissions }));
  t.mock.method(Session, 'findOne', () => query({ _id: 'session' }));
  for (const [role, Model] of Object.entries(models)) t.mock.method(Model, 'findById', () => query({ _id: '507f1f77bcf86cd799439011', role, accountStatus: 'active', email: 'admin@school.edu.ph' }));
  const CredentialMfaToken = require('../models/CredentialMfaToken');
  const mfaTokens = [];
  t.mock.method(CredentialMfaToken, 'findOne', (filter) => {
    let result = null;
    const now = new Date();
    for (let i = mfaTokens.length - 1; i >= 0; i--) {
      const tok = mfaTokens[i];
      if (tok.userId === filter.userId && tok.integration === filter.integration) {
        if (!filter.expiresAt || tok.expiresAt > now) {
          result = tok;
          break;
        }
      }
    }
    const record = result ? {
      ...result,
      save: async function() {
        const idx = mfaTokens.findIndex(x => x._id === result._id);
        if (idx !== -1) mfaTokens[idx] = this;
      }
    } : null;
    return {
      sort() { return this; },
      then(resolve) { resolve(record); }
    };
  });
  t.mock.method(CredentialMfaToken, 'deleteMany', async (filter) => {
    for (let i = mfaTokens.length - 1; i >= 0; i--) {
      if (mfaTokens[i].userId === filter.userId && mfaTokens[i].integration === filter.integration) {
        mfaTokens.splice(i, 1);
      }
    }
  });
  t.mock.method(CredentialMfaToken, 'create', async (doc) => {
    const record = { _id: 'mfa_' + Date.now(), createdAt: new Date(), attempts: 0, ...doc };
    mfaTokens.push(record);
    return record;
  });
  t.mock.method(CredentialMfaToken, 'deleteOne', async (filter) => {
    const idx = mfaTokens.findIndex(x => x._id === filter._id);
    if (idx !== -1) mfaTokens.splice(idx, 1);
  });
  const app = express(); app.use(express.json()); app.use('/settings', require('../routes/settingsRoutes')); app.use('/auth', require('../routes/authRoutes'));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { if (server.closeAllConnections) server.closeAllConnections(); server.close(resolve); }));
  const request = (path, role, body, methodOverride) => fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: methodOverride || (body ? (path.startsWith('/auth') || path.includes('/send-mfa') ? 'POST' : 'PUT') : 'GET'), headers: { 'Content-Type': 'application/json', ...(role ? { Authorization: `Bearer ${jwt.sign({ userId: '507f1f77bcf86cd799439011', role, jti: 'test' }, process.env.JWT_SECRET)}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { state, request, audit, mfaTokens, deny: () => { permissions = []; } };
}
test('admin settings read/update returns safe flags and audits old/new values', async t => {
  const { request, audit } = await fixture(t);
  assert.equal((await request('/settings', 'admin')).status, 200);
  const response = await request('/settings', 'admin', { integrations: { googleAuth: { enabled: false } } });
  assert.equal(response.status, 200);
  const body = await response.json(); assert.equal(body.data.integrations.googleAuth.enabled, false);
  assert.ok(!JSON.stringify(body).includes('secret-canary'));
  assert.deepEqual(audit.mock.calls[0].arguments[0].details.changes, [{ setting: 'googleAuth', oldEnabled: true, newEnabled: false }]);
  assert.equal((await (await request('/settings/public')).json()).data.integrations.googleAuth.enabled, false);
});
test('settings enforce roles and granular permission and reject invalid/secret settings', async t => {
  const { request, deny } = await fixture(t);
  const body = { integrations: { smtp: { enabled: false } } };
  for (const role of ['student','faculty',null]) assert.equal((await request('/settings', role, body)).status, role ? 403 : 401);
  for (const invalid of [{ smtpPassword: 'secret' }, { integrations: { smtp: { enabled: 'false' } } }, { integrations: { recaptcha: { enabled: true } } }]) assert.equal((await request('/settings','admin',invalid)).status,400);
  delete process.env.GOOGLE_CLIENT_ID;
  assert.equal((await request('/settings','admin',{integrations:{googleAuth:{enabled:true}}})).status,400);
  deny(); assert.equal((await request('/settings','admin',body)).status,403);
});
test('Google OFF rejects direct requests while password login still works; ON restores verification', async t => {
  const { state, request } = await fixture(t); state.integrations.googleAuth.enabled = false;
  const response = await request('/auth/google', null, { credential: 'fake' }); assert.equal(response.status,503); assert.match((await response.json()).message,/disabled/);
  const account = { _id:'507f1f77bcf86cd799439011', role:'admin', username:'test.admin', passwordHash:await bcrypt.hash('Test1234!',4), accountStatus:'active', save:async()=>{} };
  for (const [role, Model] of Object.entries(models)) t.mock.method(Model,'findOne',async()=>role==='admin'?account:null);
  t.mock.method(Session,'create',async()=>({}));
  assert.equal((await request('/auth/login',null,{username:'test.admin',password:'Test1234!'})).status,200);
  state.integrations.googleAuth.enabled = true;
  t.mock.method(require('google-auth-library').OAuth2Client.prototype,'verifyIdToken',async()=>{throw Error('invalid token')});
  assert.equal((await request('/auth/google',null,{credential:'fake'})).status,401);
});
test('SMTP OFF blocks reset before account lookup and transport; ON uses configured transport', async t => {
  const { state, request } = await fixture(t); state.integrations.smtp.enabled = false;
  const transport = t.mock.method(require('nodemailer'),'createTransport',()=>({sendMail:async()=>({})}));
  assert.equal((await request('/auth/password-reset/request',null,{username:'unknown'})).status,503);
  await assert.rejects(require('../utils/email').sendPasswordResetCode('test@example.invalid','123456'),/unavailable/);
  assert.equal(transport.mock.callCount(),0);
  state.integrations.smtp.enabled = true;
  await require('../utils/email').sendPasswordResetCode('test@example.invalid','123456'); assert.equal(transport.mock.callCount(),1);
});

test('maskCredential correctly reveals first 5 characters and masks remainder with asterisks', () => {
  const { maskCredential } = require('../utils/systemSettings');
  assert.equal(maskCredential(''), '');
  assert.equal(maskCredential(null), '');
  assert.equal(maskCredential('12345'), '12345*****');
  assert.equal(maskCredential('431074112550-test-client-id'), '43107' + '*'.repeat(22));
});

test('admin credential customization requires MFA code dispatch, pre-flight try-catch validation, and saves securely', async t => {
  const { request, audit, mfaTokens } = await fixture(t);
  const fs = require('node:fs');
  t.mock.method(fs, 'writeFileSync', () => {});

  const sentEmails = [];
  t.mock.method(require('nodemailer'), 'createTransport', () => ({
    sendMail: async (opts) => {
      sentEmails.push(opts);
      return { messageId: 'mfa-test-email' };
    }
  }));

  // Check initial admin settings returns masked keys
  const initialRes = await request('/settings', 'admin');
  assert.equal(initialRes.status, 200);
  const initialData = (await initialRes.json()).data;
  assert.equal(initialData.integrations.googleAuth.isCustomized, false);
  assert.equal(initialData.integrations.googleAuth.maskedKey, 'test-******');
  assert.equal(initialData.integrations.googleAuth.keyLabel, 'Google Client ID');
  assert.equal(initialData.integrations.googleAuth.canCustomize, true);

  // Non-admins cannot send MFA code or customize credentials
  for (const role of ['student', 'faculty', null]) {
    const forbiddenMfa = await request('/settings/credentials/send-mfa', role, {
      integration: 'googleAuth'
    });
    assert.equal(forbiddenMfa.status, role ? 403 : 401);

    const forbiddenPut = await request('/settings/credentials', role, {
      integration: 'googleAuth',
      customKey: '99999-mytest.apps.googleusercontent.com',
      mfaCode: '123456'
    });
    assert.equal(forbiddenPut.status, role ? 403 : 401);
  }

  // Admin requests MFA verification code
  const sendMfaRes = await request('/settings/credentials/send-mfa', 'admin', {
    integration: 'googleAuth'
  });
  assert.equal(sendMfaRes.status, 200);
  const mfaBody = await sendMfaRes.json();
  assert.equal(mfaBody.success, true);
  assert.match(mfaBody.data.maskedEmail, /a\*{3}n@school\.edu\.ph/);
  assert.equal(sentEmails.length, 1);
  assert.match(sentEmails[0].html, /Google Sign-In/);
  const codeMatch = sentEmails[0].text.match(/\b\d{6}\b/);
  assert.ok(codeMatch, 'Sent email should contain 6-digit verification code');
  const validMfaCode = codeMatch[0];

  // Cooldown rate-limit check: requesting another MFA code immediately returns 429
  const cooldownRes = await request('/settings/credentials/send-mfa', 'admin', {
    integration: 'googleAuth'
  });
  assert.equal(cooldownRes.status, 429);

  // Missing MFA code in PUT /settings/credentials returns 400
  const missingMfaRes = await request('/settings/credentials', 'admin', {
    integration: 'googleAuth',
    customKey: '99999-myapp.apps.googleusercontent.com'
  });
  assert.equal(missingMfaRes.status, 400);
  assert.match((await missingMfaRes.json()).message, /MFA verification code is required/);

  // Invalid MFA code in PUT /settings/credentials returns 400
  const invalidMfaRes = await request('/settings/credentials', 'admin', {
    integration: 'googleAuth',
    customKey: '99999-myapp.apps.googleusercontent.com',
    mfaCode: '000000'
  });
  assert.equal(invalidMfaRes.status, 400);
  assert.match((await invalidMfaRes.json()).message, /Invalid MFA verification code/);

  // Pre-flight validation (try-catch): invalid Google Client ID format rejected before saving
  const invalidFormatRes = await request('/settings/credentials', 'admin', {
    integration: 'googleAuth',
    customKey: 'invalid-google-client-id-format',
    mfaCode: validMfaCode
  });
  assert.equal(invalidFormatRes.status, 400);
  assert.match((await invalidFormatRes.json()).message, /Invalid Google Client ID format/);

  // Admin customizes Google Client ID with valid key and valid MFA code
  const updateRes = await request('/settings/credentials', 'admin', {
    integration: 'googleAuth',
    customKey: '99999-custom-app.apps.googleusercontent.com',
    mfaCode: validMfaCode
  });
  assert.equal(updateRes.status, 200);
  const updatedData = (await updateRes.json()).data;
  assert.equal(updatedData.integrations.googleAuth.isCustomized, true);
  assert.equal(updatedData.integrations.googleAuth.maskedKey.startsWith('99999'), true);
  assert.equal(updatedData.integrations.googleAuth.maskedKey.endsWith('***'), true);
  assert.equal(process.env.CUSTOM_CLIENT_ID, '99999-custom-app.apps.googleusercontent.com');
  assert.equal(process.env.CUSTOM_CIENT_ID, '99999-custom-app.apps.googleusercontent.com');

  // Verify Audit Log entry
  const lastAudit = audit.mock.calls[audit.mock.calls.length - 1].arguments[0];
  assert.equal(lastAudit.action, 'INTEGRATION_CREDENTIAL_CUSTOMIZED');
  assert.equal(lastAudit.details.integration, 'googleAuth');
  assert.equal(lastAudit.details.maskedKey.startsWith('99999'), true);

  // Single-use token check: attempting to use the same MFA code again fails
  const reuseRes = await request('/settings/credentials', 'admin', {
    integration: 'googleAuth',
    customKey: '99999-another.apps.googleusercontent.com',
    mfaCode: validMfaCode
  });
  assert.equal(reuseRes.status, 400);
  assert.match((await reuseRes.json()).message, /No active MFA verification code found/);

  // Reverting to default also requires MFA code
  // Request a new MFA code for revert (simulating expired cooldown)
  if (mfaTokens.length > 0) mfaTokens[0].createdAt = new Date(Date.now() - 35000);
  const revertMfaRes = await request('/settings/credentials/send-mfa', 'admin', {
    integration: 'googleAuth'
  });
  assert.equal(revertMfaRes.status, 200);
  const revertMfaCode = sentEmails[sentEmails.length - 1].text.match(/\b\d{6}\b/)[0];

  const revertRes = await request('/settings/credentials', 'admin', {
    integration: 'googleAuth',
    reset: true,
    mfaCode: revertMfaCode
  });
  assert.equal(revertRes.status, 200);
  const revertedData = (await revertRes.json()).data;
  assert.equal(revertedData.integrations.googleAuth.isCustomized, false);
  assert.equal(process.env.CUSTOM_CLIENT_ID || '', '');

  const resetAudit = audit.mock.calls[audit.mock.calls.length - 1].arguments[0];
  assert.equal(resetAudit.action, 'INTEGRATION_CREDENTIAL_RESET');
});
