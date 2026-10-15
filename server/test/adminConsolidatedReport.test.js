const test = require('node:test');
const assert = require('node:assert/strict');
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

function query(value) {
  const result = Promise.resolve(value);
  for (const method of ['select', 'sort', 'populate']) result[method] = () => result;
  result.lean = async () => value;
  return result;
}

async function fixture(t) {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'consolidated-report-test-only';
  t.after(() => { if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous; });
  const student = { _id: '507f1f77bcf86cd799439012', institutionId: 'REPORT-TEST', personalInformation: { firstName: 'Test', lastName: 'Student' }, enrollmentInformation: { course: 'BSIT', yearLevel: '2' }, classification: { isShifter: true }, religiousInformation: { religion: 'Test religion' }, academicStatus: { currentStatus: 'Probation' } };
  const state = { student, records: [{ academicYear: '2025-2026', semester: '1st Semester', subjects: [{ subjectCode: 'IT101', subjectName: 'Test subject', units: 3, grade: 1.5, isMajor: true, status: 'Passed' }] }], evaluation: { facultyId: { username: 'test.faculty' }, evaluationStatus: 'for_review', reasons: ['Review'], remarks: 'Test remarks', evaluatedAt: '2026-01-01' }, history: [{ status: 'Probation', reason: 'Test reason', remarks: 'History remarks', effectiveDate: '2026-01-01' }] };
  for (const [role, AccountModel] of Object.entries({ admin: AdminUser, faculty: FacultyUser, student: Student })) {
    t.mock.method(AccountModel, 'findById', id => query(
      role === id ? { _id: id, role, accountStatus: 'active' } : null
    ));
  }
  t.mock.method(SessionToken, 'findOne', () => query({ _id: 'session' }));
  t.mock.method(RolePermission, 'findOne', () => query(null));
  t.mock.method(Student, 'findOne', () => query(state.student && structuredClone(state.student)));
  for (const [model, method, key] of [[AcademicRecord, 'find', 'records'], [FacultyEvaluation, 'findOne', 'evaluation'], [StudentStatusHistory, 'find', 'history']]) {
    t.mock.method(model, method, filter => { assert.deepEqual(filter, { studentId: student._id }); return query(state[key]); });
  }
  const app = express(); app.use('/students', require('../routes/studentRoutes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const get = role => fetch(`http://127.0.0.1:${server.address().port}/students/REPORT-TEST/report`, { headers: role ? { Authorization: `Bearer ${jwt.sign({ userId: role, role, jti: 'test-session' }, process.env.JWT_SECRET)}` } : {} });
  return { state, get };
}

test('A110/A111 admin report includes persisted profile, period GWA, history and faculty remarks', async t => {
  const { state, get } = await fixture(t);
  const response = await get('admin'); assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.equal(data.student.enrollmentInformation.course, 'BSIT');
  assert.equal(data.student.classification.isShifter, true);
  assert.equal(data.student.religiousInformation.religion, 'Test religion');
  assert.equal(data.academicRecords[0].majorSubjectGwa, 1.5);
  assert.deepEqual(data.facultyEvaluation, state.evaluation);
  assert.deepEqual(data.statusHistory, state.history);
});

test('A110/A111 report handles empty sections and missing students', async t => {
  const { state, get } = await fixture(t);
  state.records = []; state.evaluation = null; state.history = [];
  const { data } = await (await get('admin')).json();
  assert.deepEqual(data.academicRecords, []); assert.equal(data.facultyEvaluation, null); assert.deepEqual(data.statusHistory, []);
  state.student = null; assert.equal((await get('admin')).status, 404);
});

test('A110/A111 report rejects students and unauthenticated callers; faculty projection stays restricted', async t => {
  const { get } = await fixture(t);
  assert.equal((await get('student')).status, 403);
  assert.equal((await get(null)).status, 401);
  const response = await get('faculty'); assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.equal(data.student.religiousInformation, undefined);
  assert.equal(data.facultyEvaluation.remarks, 'Test remarks');
});
