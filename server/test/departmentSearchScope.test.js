const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const FacultyUser = require('../models/FacultyUser');
const RolePermission = require('../models/RolePermission');
const SessionToken = require('../models/SessionToken');
const Student = require('../models/Student');
const studentRoutes = require('../routes/studentRoutes');

const queryResult = (value) => ({
  select() { return this; },
  lean: async () => value
});

test('student search suggestions are limited to the signed-in officer department', async (t) => {
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'department-search-scope-test-secret';
  t.after(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  t.mock.method(FacultyUser, 'findById', () => queryResult({
    username: '2345678901',
    role: 'faculty',
    accountStatus: 'active',
    departmentCode: 'IT',
    isVerifiedEnrollmentOfficer: true
  }));
  t.mock.method(SessionToken, 'findOne', () => queryResult({ _id: 'session-id' }));
  t.mock.method(RolePermission, 'findOne', () => queryResult(null));

  let studentFilter;
  t.mock.method(Student, 'find', (filter) => {
    studentFilter = filter;
    return {
      sort() { return this; },
      limit() { return this; },
      lean: async () => [{
        institutionId: '2021301234',
        username: 'jamie.student',
        personalInformation: { firstName: 'Jamie', lastName: 'Student' }
      }]
    };
  });

  const app = express();
  app.use('/api/students', studentRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const token = jwt.sign({
    jti: 'department-search-session',
    userId: 'faculty-document-id',
    role: 'faculty'
  }, process.env.JWT_SECRET);
  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/students/search?q=Jamie`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(studentFilter.$and[1], {
    'classification.program': 'Bachelor of Information Technology'
  });
  const payload = await response.json();
  assert.deepEqual(payload.data.students.map((student) => student.institutionId), ['2021301234']);
});
