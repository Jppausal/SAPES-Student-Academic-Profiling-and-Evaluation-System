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

test('student profile update syncs root firstName and lastName and persists health accommodations', async t => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'student-profile-name-sync-test-secret';
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const student = {
    _id: '507f1f77bcf86cd799439012',
    institutionId: '2023-9999',
    username: '2023-9999',
    role: 'student',
    accountStatus: 'active',
    firstName: 'OldFirst',
    lastName: 'OldLast',
    personalInformation: { firstName: 'OldFirst', lastName: 'OldLast' },
    healthInformation: {},
    markModified: () => {},
    save: async function () {
      if (this.personalInformation?.firstName) this.firstName = this.personalInformation.firstName.trim();
      if (this.personalInformation?.lastName) this.lastName = this.personalInformation.lastName.trim();
    }
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
    jti: 'student-name-sync-session',
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
      personalInformation: {
        firstName: 'Juan',
        lastName: 'Dela Cruz'
      },
      healthInformation: {
        hasRelevantHealthConcern: true,
        conditions: ['Asthma'],
        physicalActivityClearance: 'restricted',
        accommodationRequired: true,
        assistanceNeeds: ['Frequent Rest / Medical Breaks'],
        otherAssistanceDetails: 'Needs quick access to inhaler',
        medicalCertificate: {
          fileName: 'medcert.png',
          fileData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          fileType: 'image/png',
          fileSize: 120
        }
      }
    })
  });

  assert.equal(response.status, 200);
  assert.equal(student.firstName, 'Juan');
  assert.equal(student.lastName, 'Dela Cruz');
  assert.equal(student.personalInformation.firstName, 'Juan');
  assert.equal(student.personalInformation.lastName, 'Dela Cruz');
  assert.equal(student.healthInformation.physicalActivityClearance, 'restricted');
  assert.deepEqual(student.healthInformation.assistanceNeeds, ['Frequent Rest / Medical Breaks']);
  assert.equal(student.healthInformation.medicalCertificate.fileName, 'medcert.png');
});
