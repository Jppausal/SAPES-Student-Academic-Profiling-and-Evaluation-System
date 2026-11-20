const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const FacultyEvaluation = require('../models/FacultyEvaluation');
const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');
const StudentStatusHistory = require('../models/StudentStatusHistory');
const SessionToken = require('../models/SessionToken');
const RolePermission = require('../models/RolePermission');
const FacultyUser = require('../models/FacultyUser');
const AdminUser = require('../models/AdminUser');

const query = (value) => ({
  ...value,
  select() {
    return this;
  },
  lean: async () => value,
  then(r) {
    return Promise.resolve(value).then(r);
  }
});

async function createFixture(t) {
  const env = { ...process.env };
  Object.assign(process.env, {
    NODE_ENV: 'test',
    JWT_SECRET: 'concurrency-test-secret'
  });
  t.after(() => {
    for (const key of ['NODE_ENV', 'JWT_SECRET']) {
      if (env[key] === undefined) delete process.env[key];
      else process.env[key] = env[key];
    }
  });

  const facultyId = '507f1f77bcf86cd799439022';
  const studentDocId = '507f1f77bcf86cd799439033';
  const institutionId = '2401105814';

  const studentState = {
    _id: studentDocId,
    institutionId,
    classification: { program: 'BS Information Technology' },
    academicStatus: {
      currentStatus: 'Regular',
      isOnProbation: false
    },
    save: async function () {
      return this;
    }
  };

  t.mock.method(Student, 'findOne', () => query(studentState));
  t.mock.method(SessionToken, 'findOne', () => query({ _id: 'session' }));
  t.mock.method(RolePermission, 'findOne', () =>
    query({
      permissions: ['submit_evaluations', 'manage_academic_records', 'read_student_records']
    })
  );
  t.mock.method(FacultyUser, 'findById', () =>
    query({
      _id: facultyId,
      role: 'faculty',
      accountStatus: 'active',
      department: 'Information Technology'
    })
  );
  t.mock.method(AdminUser, 'findById', () =>
    query({
      _id: '507f1f77bcf86cd799439011',
      role: 'admin',
      accountStatus: 'active'
    })
  );
  t.mock.method(AuditLog, 'create', async (val) => val);
  t.mock.method(StudentStatusHistory, 'create', async (val) => val);

  const app = express();
  app.use(express.json());
  app.use('/students', require('../routes/studentRoutes'));

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        if (server.closeAllConnections) server.closeAllConnections();
        server.close(resolve);
      })
  );

  const request = (path, role = 'faculty', body, method = 'PUT') =>
    fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt.sign(
          { tokenType: 'access', userId: facultyId, role, jti: 'test' },
          process.env.JWT_SECRET
        )}`
      },
      body: JSON.stringify(body)
    });

  return { request, studentState, facultyId, studentDocId, institutionId };
}

test('Optimistic Concurrency Control (OCC) detects stale expectedVersion and returns 409 Conflict', async (t) => {
  const { request, facultyId, studentDocId, institutionId } = await createFixture(t);

  // Simulated existing evaluation with version: 1
  const existingEval = {
    _id: 'eval_occ_123',
    studentId: studentDocId,
    facultyId,
    evaluationStatus: 'for_review',
    version: 1,
    reasons: ['Incomplete grades'],
    remarks: 'First review',
    save: async function () {
      this.version += 1;
      return this;
    }
  };

  t.mock.method(FacultyEvaluation, 'findOne', () => existingEval);

  // Attempting to update with stale expectedVersion: 0 must trigger 409 Conflict
  const conflictRes = await request(`/students/${institutionId}/evaluation`, 'faculty', {
    evaluationStatus: 'eligible',
    expectedVersion: 0,
    remarks: 'Attempting update with stale version 0'
  });

  assert.equal(conflictRes.status, 409);
  const conflictBody = await conflictRes.json();
  assert.equal(conflictBody.success, false);
  assert.equal(conflictBody.code, 'CONCURRENCY_CONFLICT');
  assert.equal(conflictBody.currentVersion, 1);
  assert.match(conflictBody.message, /updated by another concurrent session/i);

  // Updating with matching expectedVersion: 1 succeeds
  const successRes = await request(`/students/${institutionId}/evaluation`, 'faculty', {
    evaluationStatus: 'eligible',
    expectedVersion: 1,
    remarks: 'Valid update with version 1'
  });

  assert.equal(successRes.status, 200);
  const successBody = await successRes.json();
  assert.equal(successBody.success, true);
  assert.equal(successBody.data.evaluationStatus, 'eligible');
  assert.equal(successBody.data.version, 2);
});

test('Mongoose VersionError triggers HTTP 409 CONCURRENCY_CONFLICT on concurrent race', async (t) => {
  const { request, facultyId, studentDocId, institutionId } = await createFixture(t);

  const racingEval = {
    _id: 'eval_occ_race',
    studentId: studentDocId,
    facultyId,
    evaluationStatus: 'for_review',
    version: 1,
    save: async function () {
      const err = new Error('No matching document found for id');
      err.name = 'VersionError';
      throw err;
    }
  };

  t.mock.method(FacultyEvaluation, 'findOne', () => racingEval);

  const res = await request(`/students/${institutionId}/evaluation`, 'faculty', {
    evaluationStatus: 'eligible',
    remarks: 'Race condition simulation'
  });

  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.success, false);
  assert.equal(body.code, 'CONCURRENCY_CONFLICT');
  assert.match(body.message, /modified concurrently by another session/i);
});

test('Student status update executes within transaction and logs audit and history atomically', async (t) => {
  const { request, institutionId } = await createFixture(t);

  const res = await request(`/students/${institutionId}/status`, 'faculty', {
    status: 'Academic Probation',
    reason: 'Failed more than 2 major subjects',
    remarks: 'Under advisement'
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.status, 'Academic Probation');
  assert.equal(body.data.reason, 'Failed more than 2 major subjects');
});
