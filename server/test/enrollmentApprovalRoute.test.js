const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const AuditLog = require('../models/AuditLog');
const Department = require('../models/Department');
const FacultyUser = require('../models/FacultyUser');
const RolePermission = require('../models/RolePermission');
const SessionToken = require('../models/SessionToken');
const Student = require('../models/Student');
const facultyEvaluationRoutes = require('../routes/facultyEvaluationRoutes');

const queryResult = (value) => ({
  select() { return this; },
  lean: async () => value
});

test('enrollment approval updates student status and synchronizes department metrics', async (t) => {
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'enrollment-approval-test-secret';
  t.after(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  const program = 'Bachelor of Information Technology';
  t.mock.method(FacultyUser, 'findById', () => queryResult({
    username: '2345678901',
    role: 'faculty',
    accountStatus: 'active',
    departmentCode: 'IT',
    isVerifiedEnrollmentOfficer: true
  }));
  t.mock.method(SessionToken, 'findOne', () => queryResult({ _id: 'session-id' }));
  t.mock.method(RolePermission, 'findOne', () => queryResult(null));

  let updateFilter;
  let updateDocument;
  const student = {
    _id: 'student-document-id',
    institutionId: '2021301236',
    enrollmentStatus: 'enrolled'
  };
  t.mock.method(Student, 'findOneAndUpdate', (filter, update) => {
    updateFilter = filter;
    updateDocument = update;
    return {
      select() { return this; },
      lean: async () => student
    };
  });
  t.mock.method(Student, 'aggregate', async () => [{
    totalStudents: 1,
    evaluatedProfiles: 1,
    pendingEnrollmentDecisions: 0,
    profilesAwaitingEvaluation: 0
  }]);
  let metricUpdate;
  t.mock.method(Department, 'findOneAndUpdate', (filter, update) => {
    metricUpdate = { filter, update };
    return { lean: async () => ({ ...filter, ...update.$set }) };
  });
  let auditEntry;
  t.mock.method(AuditLog, 'create', async (entry) => {
    auditEntry = entry;
    return entry;
  });

  const app = express();
  app.use('/api/faculty-evaluations', facultyEvaluationRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const token = jwt.sign({
    jti: 'enrollment-approval-session',
    userId: 'faculty-document-id',
    role: 'faculty'
  }, process.env.JWT_SECRET);
  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/faculty-evaluations/student/2021301236/enrollment-approval`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    data: { institutionId: '2021301236', enrollmentStatus: 'enrolled' }
  });
  assert.deepEqual(updateDocument, { $set: { enrollmentStatus: 'enrolled' } });
  assert.deepEqual(updateFilter.$and, [
    { institutionId: '2021301236', accountStatus: 'active' },
    { 'classification.program': program }
  ]);
  assert.equal(metricUpdate.filter.code, 'IT');
  assert.equal(auditEntry.action, 'STUDENT_ENROLLMENT_APPROVED');
  assert.equal(auditEntry.targetId, student._id);
});
