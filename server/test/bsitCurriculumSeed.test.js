const test = require('node:test');
const assert = require('node:assert/strict');

const {
  BSIT_TEST_STUDENTS,
  buildRecordsForStudent
} = require('../scripts/seedBsitCurriculumStudents');
const { validateAndNormalizeAcademicRecord } = require('../utils/academicRecord');

test('defines five distinct BSIT test students', () => {
  assert.equal(BSIT_TEST_STUDENTS.length, 5);
  assert.equal(new Set(BSIT_TEST_STUDENTS.map((student) => student.username)).size, 5);
  assert.equal(new Set(BSIT_TEST_STUDENTS.map((student) => student.institutionId)).size, 5);
});

test('assigns every BSIT test student the same four-term curriculum', () => {
  const records = BSIT_TEST_STUDENTS.map((_, index) => buildRecordsForStudent(index));
  const expectedPeriodKeys = records[0].map((record) => `${record.academicYear}/${record.semester}`);
  const expectedSubjectCodes = records[0].map((record) => record.subjects.map((subject) => subject.subjectCode));

  for (const studentRecords of records) {
    assert.deepEqual(studentRecords.map((record) => `${record.academicYear}/${record.semester}`), expectedPeriodKeys);
    assert.deepEqual(studentRecords.map((record) => record.subjects.map((subject) => subject.subjectCode)), expectedSubjectCodes);
    for (const record of studentRecords) {
      assert.equal(validateAndNormalizeAcademicRecord(record).error, undefined);
    }
  }
});

test('uses fictional grade variation without changing curriculum subjects', () => {
  const firstStudent = buildRecordsForStudent(0).flatMap((record) => record.subjects);
  const secondStudent = buildRecordsForStudent(1).flatMap((record) => record.subjects);

  assert.deepEqual(firstStudent.map((subject) => subject.subjectCode), secondStudent.map((subject) => subject.subjectCode));
  assert.notDeepEqual(firstStudent.map((subject) => subject.grade), secondStudent.map((subject) => subject.grade));
});
