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
const query = value => ({ select() { return this; }, lean: async () => value });
async function fixture(t) {
  const env = { ...process.env };
  Object.assign(process.env, { JWT_SECRET: 'settings-test', GOOGLE_CLIENT_ID: 'test-client', SMTP_HOST: 'test-host', SMTP_FROM: 'test@example.invalid', SMTP_USER: 'test', SMTP_PASSWORD: 'secret-canary' });
  t.after(() => { for (const key of ['JWT_SECRET','GOOGLE_CLIENT_ID','SMTP_HOST','SMTP_FROM','SMTP_USER','SMTP_PASSWORD']) { if (env[key] === undefined) delete process.env[key]; else process.env[key] = env[key]; } });
  const state = { integrations: { googleAuth: { enabled: true }, smtp: { enabled: true }, recaptcha: { enabled: false } } };
  t.mock.method(Settings, 'findById', () => query(state));
  t.mock.method(Settings, 'findOneAndUpdate', async (_filter, update) => {
    const before = structuredClone(state);
    for (const [key, value] of Object.entries(update.$set)) if (key.startsWith('integrations.')) state.integrations[key.split('.')[1]].enabled = value;
    return before;
  });
  const audit = t.mock.method(Audit, 'create', async value => value);
  let permissions = ['manage_users'];
  t.mock.method(Permissions, 'findOne', () => query({ permissions }));
  t.mock.method(Session, 'findOne', () => query({ _id: 'session' }));
  for (const [role, Model] of Object.entries(models)) t.mock.method(Model, 'findById', () => query({ role, accountStatus: 'active' }));
  const app = express(); app.use(express.json()); app.use('/settings', require('../routes/settingsRoutes')); app.use('/auth', require('../routes/authRoutes'));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (path, role, body) => fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: body ? (path.startsWith('/auth') ? 'POST' : 'PUT') : 'GET', headers: { 'Content-Type': 'application/json', ...(role ? { Authorization: `Bearer ${jwt.sign({ userId: '507f1f77bcf86cd799439011', role, jti: 'test' }, process.env.JWT_SECRET)}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { state, request, audit, deny: () => { permissions = []; } };
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
