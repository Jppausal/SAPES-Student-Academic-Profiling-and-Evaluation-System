const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const Department = require('../models/Department');
const FacultyUser = require('../models/FacultyUser');
const RolePermission = require('../models/RolePermission');
const SessionToken = require('../models/SessionToken');
const Student = require('../models/Student');
const FacultyEvaluation = require('../models/FacultyEvaluation');
const facultyEvaluationRoutes = require('../routes/facultyEvaluationRoutes');

const queryResult = (value) => ({
  select() { return this; },
  lean: async () => value
});

test('department dashboard returns synchronized metrics and rejects another program', async (t) => {
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'department-dashboard-test-secret';
  t.after(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  const departmentMetrics = {
    code: 'IT',
    name: 'Information Technology',
    program: 'Bachelor of Information Technology',
    totalStudents: 6,
    profilesAwaitingEvaluation: 3,
    pendingEnrollmentDecisions: 1,
    evaluatedProfiles: 2
  };
  t.mock.method(FacultyUser, 'findById', () => queryResult({
    username: '2345678901',
    role: 'faculty',
    accountStatus: 'active',
    department: departmentMetrics.name,
    departmentCode: 'IT',
    designation: 'IT-Enrollment Officer',
    isVerifiedEnrollmentOfficer: true
  }));
  t.mock.method(SessionToken, 'findOne', () => queryResult({ _id: 'session-id' }));
  t.mock.method(RolePermission, 'findOne', () => queryResult(null));
  t.mock.method(Student, 'aggregate', async () => [{
    totalStudents: 6,
    profilesAwaitingEvaluation: 3,
    pendingEnrollmentDecisions: 1,
    evaluatedProfiles: 2
  }]);
  const student = {
    _id: 'department-student-id',
    institutionId: '2021301234',
    personalInformation: { firstName: 'Jamie', lastName: 'Student' },
    classification: { program: departmentMetrics.program },
    yearLevel: 2,
    enrollmentStatus: 'processing'
  };
  let studentQueryCount = 0;
  t.mock.method(Student, 'find', (filter, projection) => {
    assert.equal(filter.accountStatus, 'active');
    assert.equal(filter['classification.program'], departmentMetrics.program);
    if (!projection) {
      return { distinct: async () => [student._id] };
    }
    studentQueryCount += 1;
    return {
      sort() { return this; },
      limit() { return this; },
      lean: async () => studentQueryCount === 1 ? [student] : []
    };
  });
  t.mock.method(FacultyEvaluation, 'find', (filter) => {
    assert.deepEqual(filter.studentId.$in, [student._id]);
    return {
      sort() { return this; },
      limit() { return this; },
      lean: async () => []
    };
  });
  t.mock.method(Department, 'findOneAndUpdate', (filter, update) => ({
    lean: async () => ({ ...filter, ...update.$set })
  }));

  const app = express();
  app.use('/api/faculty-evaluations', facultyEvaluationRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const token = jwt.sign({
    jti: 'department-dashboard-session',
    userId: 'faculty-document-id',
    role: 'faculty'
  }, process.env.JWT_SECRET);
  const headers = { Authorization: `Bearer ${token}` };
  const dashboardResponse = await fetch(
    `http://127.0.0.1:${server.address().port}/api/faculty-evaluations/department-dashboard`,
    { headers }
  );
  assert.equal(dashboardResponse.status, 200);
  const dashboard = await dashboardResponse.json();
  assert.deepEqual({
    code: dashboard.data.code,
    name: dashboard.data.name,
    program: dashboard.data.program,
    totalStudents: dashboard.data.totalStudents,
    profilesAwaitingEvaluation: dashboard.data.profilesAwaitingEvaluation,
    pendingEnrollmentDecisions: dashboard.data.pendingEnrollmentDecisions,
    evaluatedProfiles: dashboard.data.evaluatedProfiles
  }, departmentMetrics);
  assert.equal(Number.isNaN(Date.parse(dashboard.data.lastSyncedAt)), false);
  assert.deepEqual(dashboard.data.recentStudents, [{
    institutionId: '2021301234',
    name: 'Jamie Student',
    program: departmentMetrics.program,
    yearLevel: 2,
    enrollmentStatus: 'processing'
  }]);
  assert.deepEqual(dashboard.data.recentEvaluations, []);

  const otherProgramResponse = await fetch(
    `http://127.0.0.1:${server.address().port}/api/faculty-evaluations/roster?program=Automotive%20Technology`,
    { headers }
  );
  assert.equal(otherProgramResponse.status, 403);
});
