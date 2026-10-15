const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateMajorSubjectGwa } = require('../utils/academicCalculations');
const { STUDENT_TEST_RECORDS } = require('../scripts/seedStudentTestAcademicRecords');
const { DEMO_ACADEMIC_RECORD, DEMO_INSTITUTION_ID } = require('../scripts/seedStudentAcademicDemoRecord');

test('screenshot student demo record contains nine fictional BSIT subjects', () => {
  assert.equal(DEMO_INSTITUTION_ID, '2021301234');
  assert.equal(DEMO_ACADEMIC_RECORD.subjects.length, 9);
  assert.equal(DEMO_ACADEMIC_RECORD.subjects.filter((subject) => !subject.isMajor).length, 2);
  assert.equal(DEMO_ACADEMIC_RECORD.subjects.filter((subject) => subject.isMajor).length, 7);
  assert.ok(DEMO_ACADEMIC_RECORD.subjects.some((subject) =>
    subject.subjectCode === 'IT 301' && subject.isMajor
  ));
  assert.ok(DEMO_ACADEMIC_RECORD.subjects.some((subject) =>
    subject.subjectCode === 'IT 302' && subject.isMajor
  ));
});

test('student.test seed contains distinct required 2025-2026 periods', () => {
  const first = STUDENT_TEST_RECORDS.find((record) =>
    record.academicYear === '2025-2026' && record.semester === '1st Semester'
  );
  const second = STUDENT_TEST_RECORDS.find((record) =>
    record.academicYear === '2025-2026' && record.semester === '2nd Semester'
  );

  assert.ok(first);
  assert.ok(second);
  assert.notDeepEqual(
    first.subjects.map((subject) => subject.subjectCode),
    second.subjects.map((subject) => subject.subjectCode)
  );
  assert.deepEqual(first.subjects.map((subject) => subject.subjectCode), ['IT 201', 'IT 202', 'GE 201']);
  assert.deepEqual(second.subjects.map((subject) => subject.subjectCode), ['IT 211', 'IT 212', 'GE 205']);
});

test('calculates period-specific major GWA without mixing semesters', () => {
  const first = STUDENT_TEST_RECORDS.find((record) => record.semester === '1st Semester');
  const second = STUDENT_TEST_RECORDS.find((record) => record.semester === '2nd Semester' && record.academicYear === '2025-2026');

  assert.equal(calculateMajorSubjectGwa([first]), 1.75);
  assert.equal(calculateMajorSubjectGwa([second]), 1.63);
  assert.equal(calculateMajorSubjectGwa([first, second]), 1.69);
});
