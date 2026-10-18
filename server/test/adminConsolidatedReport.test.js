const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const FacultyUser = require('../models/FacultyUser');
const AdminUser = require('../models/AdminUser');
const AcademicRecord = require('../models/AcademicRecord');
const FacultyEvaluation = require('../models/FacultyEvaluation');
const StudentStatusHistory = require('../models/StudentStatusHistory');
const SessionToken = require('../models/SessionToken');
const RolePermission = require('../models/RolePermission');

const query = value => {
  const result = Promise.resolve(value);
  for (const method of ['select', 'sort', 'populate']) result[method] = () => result;
  result.lean = async () => value;
  return result;
};

async function fixture(t) {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'consolidated-report-test-only';
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const student = {
    _id: '507f1f77bcf86cd799439012',
    institutionId: 'REPORT-TEST',
    personalInformation: { firstName: 'Test', lastName: 'Student' },
    enrollmentInformation: { course: 'BSIT', yearLevel: '2' },
    classification: { isShifter: true },
    religiousInformation: { religion: 'Test religion' },
    academicStatus: { currentStatus: 'Probation' },
    healthInformation: {
      hasRelevantHealthConcern: true,
      accommodationRequired: true,
      accommodationNotes: 'Accessible seating',
      conditions: ['Asthma'],
      allergyDetails: 'Dust',
      emergencyContactName: 'Private Contact',
      emergencyContactNumber: '09170000000',
      bloodType: 'O+'
    }
  };
  const state = {
    student,
    records: [{
      academicYear: '2025-2026',
      semester: '1st Semester',
      subjects: [{ subjectCode: 'IT101', subjectName: 'Test subject', units: 3, grade: 1.5, isMajor: true, status: 'Passed' }]
    }],
    evaluation: {
      facultyId: { username: 'test.faculty' },
      evaluationStatus: 'for_review',
      reasons: ['Review'],
      remarks: 'Test remarks',
      evaluatedAt: '2026-01-01'
    },
    history: [{ status: 'Probation', reason: 'Test reason', remarks: 'History remarks', effectiveDate: '2026-01-01' }]
  };

  for (const [role, Model] of Object.entries({ admin: AdminUser, faculty: FacultyUser, student: Student })) {
    t.mock.method(Model, 'findById', id => query(
      role === id ? { _id: id, role, accountStatus: 'active' } : null
    ));
  }
  t.mock.method(SessionToken, 'findOne', () => query({ _id: 'session' }));
  t.mock.method(RolePermission, 'findOne', () => query(null));
  t.mock.method(Student, 'findOne', () => query(state.student && structuredClone(state.student)));
  for (const [model, method, key] of [
    [AcademicRecord, 'find', 'records'],
    [FacultyEvaluation, 'findOne', 'evaluation'],
    [StudentStatusHistory, 'find', 'history']
  ]) {
    t.mock.method(model, method, filter => {
      assert.deepEqual(filter, { studentId: student._id });
      return query(state[key]);
    });
  }

  const app = express();
  app.use('/students', require('../routes/studentRoutes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const get = role => fetch(`http://127.0.0.1:${server.address().port}/students/REPORT-TEST/report`, {
    headers: role
      ? { Authorization: `Bearer ${jwt.sign({ userId: role, role, jti: 'test-session' }, process.env.JWT_SECRET)}` }
      : {}
  });
  return { state, get };
}

test('administrator report includes student profile, academic records, evaluation, and status history', async t => {
  const { state, get } = await fixture(t);
  const response = await get('admin');
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.equal(data.student.enrollmentInformation.course, 'BSIT');
  assert.equal(data.student.classification.isShifter, true);
  assert.equal(data.student.religiousInformation.religion, 'Test religion');
  assert.equal(data.academicRecords[0].majorSubjectGwa, 1.5);
  assert.deepEqual(data.facultyEvaluation, state.evaluation);
  assert.deepEqual(data.statusHistory, state.history);
});

test('administrator report handles empty sections and missing students', async t => {
  const { state, get } = await fixture(t);
  state.records = [];
  state.evaluation = null;
  state.history = [];
  const response = await get('admin');
  const { data } = await response.json();
  assert.deepEqual(data.academicRecords, []);
  assert.equal(data.facultyEvaluation, null);
  assert.deepEqual(data.statusHistory, []);
  state.student = null;
  assert.equal((await get('admin')).status, 404);
});

test('report authorization denies student and anonymous callers', async t => {
  const { get } = await fixture(t);
  assert.equal((await get('student')).status, 403);
  assert.equal((await get(null)).status, 401);
  assert.equal((await get('faculty')).status, 200);
});

test('faculty report returns only authorized health information and shared probation status', async t => {
  const { state, get } = await fixture(t);
  const response = await get('faculty');
  assert.equal(response.status, 200);
  const { data } = await response.json();

  assert.deepEqual(data.student.healthInformation, {
    hasRelevantHealthConcern: true,
    accommodationRequired: true,
    accommodationNotes: 'Accessible seating'
  });
  assert.equal(data.student.academicStatus.isOnProbation, true);
  assert.equal(data.student.academicStatus.currentStatus, 'Probation');
  assert.equal('conditions' in data.student.healthInformation, false);
  assert.equal('allergyDetails' in data.student.healthInformation, false);
  assert.equal('emergencyContactName' in data.student.healthInformation, false);
  assert.equal('bloodType' in data.student.healthInformation, false);

  state.student.academicStatus = { currentStatus: 'On academic probation' };
  const statusTextResponse = await get('faculty');
  assert.equal((await statusTextResponse.json()).data.student.academicStatus.isOnProbation, true);

  state.student.academicStatus = { currentStatus: 'Regular', isOnProbation: false };
  const regularResponse = await get('faculty');
  assert.equal((await regularResponse.json()).data.student.academicStatus.isOnProbation, false);
});
