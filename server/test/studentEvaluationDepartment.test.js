const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const AuditLog = require('../models/AuditLog');
const Department = require('../models/Department');
const FacultyEvaluation = require('../models/FacultyEvaluation');
const FacultyUser = require('../models/FacultyUser');
const RolePermission = require('../models/RolePermission');
const SessionToken = require('../models/SessionToken');
const Student = require('../models/Student');
const studentRoutes = require('../routes/studentRoutes');

const queryResult = (value) => ({
  select() { return this; },
  lean: async () => value
});

test('saving an officer evaluation applies department scope and synchronizes metrics', async (t) => {
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'student-evaluation-department-test-secret';
  t.after(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  const userId = 'faculty-document-id';
  const student = {
    _id: 'student-document-id',
    classification: { program: 'Bachelor of Information Technology' }
  };
  let studentFilter;
  let evaluationSaved = false;
  let metricSyncCount = 0;
  const evaluation = {
    _id: 'evaluation-document-id',
    studentId: student._id,
    facultyId: userId,
    save: async () => { evaluationSaved = true; }
  };

  t.mock.method(FacultyUser, 'findById', () => queryResult({
    username: '2345678901',
    role: 'faculty',
    accountStatus: 'active',
    departmentCode: 'IT',
    isVerifiedEnrollmentOfficer: true
  }));
  t.mock.method(SessionToken, 'findOne', () => queryResult({ _id: 'session-id' }));
  t.mock.method(RolePermission, 'findOne', () => queryResult(null));
  t.mock.method(Student, 'findOne', (filter) => {
    studentFilter = filter;
    return queryResult(student);
  });
  t.mock.method(Student, 'aggregate', async () => {
    metricSyncCount += 1;
    return [{
      totalStudents: 1,
      profilesAwaitingEvaluation: 0,
      pendingEnrollmentDecisions: 0,
      evaluatedProfiles: 1
    }];
  });
  t.mock.method(FacultyEvaluation, 'findOne', async () => evaluation);
  t.mock.method(Department, 'findOneAndUpdate', (filter, update) => ({
    lean: async () => ({ ...filter, ...update.$set })
  }));
  t.mock.method(AuditLog, 'create', async () => ({}));

  const app = express();
  app.use(express.json());
  app.use('/api/students', studentRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const token = jwt.sign({
    jti: 'student-evaluation-session',
    userId,
    role: 'faculty'
  }, process.env.JWT_SECRET);
  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/students/2021301234/evaluation`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ evaluationStatus: 'eligible' })
    }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(studentFilter, {
    $and: [
      { institutionId: '2021301234' },
      { 'classification.program': 'Bachelor of Information Technology' }
    ]
  });
  assert.equal(evaluationSaved, true);
  assert.equal(metricSyncCount, 1);
});
