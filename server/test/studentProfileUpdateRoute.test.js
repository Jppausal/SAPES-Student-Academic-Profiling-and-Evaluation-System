const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const SessionToken = require('../models/SessionToken');
const RolePermission = require('../models/RolePermission');
const AuditLog = require('../models/AuditLog');

const query = value => {
  const result = Promise.resolve(value);
  result.select = () => result;
  result.lean = async () => value;
  return result;
};

test('student self-service saves all address location fields including region', async t => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'student-profile-address-test-secret';
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const student = {
    _id: '507f1f77bcf86cd799439011',
    institutionId: 'TEST-ADDRESS',
    username: 'test.address',
    role: 'student',
    accountStatus: 'active',
    personalInformation: { firstName: 'Test', lastName: 'Student' },
    addresses: {
      presentAddress: {},
      homeAddress: {}
    },
    save: async () => {}
  };

  t.mock.method(Student, 'findById', () => query({
    username: student.username,
    role: student.role,
    accountStatus: student.accountStatus
  }));
  t.mock.method(Student, 'findOne', () => query(student));
  t.mock.method(SessionToken, 'findOne', () => query({ _id: 'session' }));
  t.mock.method(RolePermission, 'findOne', () => query(null));
  t.mock.method(AuditLog, 'create', async () => ({}));

  const app = express();
  app.use(express.json());
  app.use('/api/me', require('../routes/meRoutes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const token = jwt.sign({
    jti: 'student-profile-session',
    userId: student._id,
    role: 'student'
  }, process.env.JWT_SECRET);
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/me/student/profile`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      addresses: {
        presentAddress: {
          country: 'Philippines',
          region: 'Northern Mindanao',
          province: 'Bukidnon',
          municipality: 'Malaybalay City',
          barangay: 'Barangay 1',
          street: 'University Road',
          zipCode: '8700'
        },
        homeAddress: {
          country: 'Philippines',
          region: 'Northern Mindanao',
          province: 'Bukidnon',
          municipality: 'Valencia City',
          barangay: 'Lumbo',
          street: 'Riverside',
          zipCode: '8709'
        }
      }
    })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(student.addresses.presentAddress, {
    country: 'Philippines',
    region: 'Northern Mindanao',
    province: 'Bukidnon',
    municipality: 'Malaybalay City',
    barangay: 'Barangay 1',
    street: 'University Road',
    zipCode: '8700'
  });
  assert.deepEqual(student.addresses.homeAddress, {
    country: 'Philippines',
    region: 'Northern Mindanao',
    province: 'Bukidnon',
    municipality: 'Valencia City',
    barangay: 'Lumbo',
    street: 'Riverside',
    zipCode: '8709'
  });
  const savedProfile = await response.json();
  assert.equal(savedProfile.data.addresses.presentAddress.region, 'Northern Mindanao');
});
