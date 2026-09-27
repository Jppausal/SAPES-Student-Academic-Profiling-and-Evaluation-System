const test = require('node:test');
const assert = require('node:assert/strict');

const { validateAndNormalizeAcademicRecord } = require('../utils/academicRecord');

const validRecord = () => ({
  academicYear: ' 2026-2027 ',
  semester: ' 1st Semester ',
  subjects: [{
    subjectCode: ' it301 ',
    subjectName: ' Database Management Systems ',
    units: 3,
    grade: 1.5,
    isMajor: true,
    status: ' Completed '
  }]
});

test('normalizes a valid academic record', () => {
  const result = validateAndNormalizeAcademicRecord(validRecord());

  assert.equal(result.error, undefined);
  assert.equal(result.value.academicYear, '2026-2027');
  assert.equal(result.value.semester, '1st Semester');
  assert.deepEqual(result.value.subjects[0], {
    subjectCode: 'IT301',
    subjectName: 'Database Management Systems',
    units: 3,
    grade: 1.5,
    isMajor: true,
    status: 'Completed'
  });
});

test('rejects unsupported fields and malformed subject values', () => {
  const unsupported = validateAndNormalizeAcademicRecord({
    ...validRecord(),
    studentId: 'client-selected-id'
  });
  const invalidGrade = validRecord();
  invalidGrade.subjects[0].grade = 6;

  assert.equal(unsupported.error, 'studentId is not supported');
  assert.equal(
    validateAndNormalizeAcademicRecord(invalidGrade).error,
    'subjects[0].grade must be a number from 0 to 5'
  );
});

test('rejects duplicate subject codes within a term', () => {
  const record = validRecord();
  record.subjects.push({
    ...record.subjects[0],
    subjectCode: 'IT301'
  });

  assert.equal(
    validateAndNormalizeAcademicRecord(record).error,
    'subjects[1].subjectCode must be unique within the record'
  );
});
