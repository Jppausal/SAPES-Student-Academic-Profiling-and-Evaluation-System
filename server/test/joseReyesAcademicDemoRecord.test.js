const assert = require('node:assert/strict');
const test = require('node:test');
const { ACADEMIC_RECORD, STUDENT_INSTITUTION_ID, STUDENT_NAME, SYNTHETIC_PROBATION_REASON } = require('../scripts/seedJoseReyesAcademicDemoRecord');
const { validateAndNormalizeAcademicRecord } = require('../utils/academicRecord');

test('Jose Reyes academic fixture is valid and explicitly synthetic', () => {
  const normalized = validateAndNormalizeAcademicRecord(ACADEMIC_RECORD);

  assert.equal(STUDENT_INSTITUTION_ID, '2021301236');
  assert.equal(STUDENT_NAME, 'Jose Reyes');
  assert.match(SYNTHETIC_PROBATION_REASON, /synthetic test data/i);
  assert.equal(normalized.error, undefined);
  assert.equal(normalized.value.subjects.length, 8);
  assert.equal(normalized.value.subjects.filter((subject) => subject.isMajor).length, 4);
  assert.equal(normalized.value.subjects.filter((subject) => !subject.isMajor).length, 4);
  assert.ok(normalized.value.subjects.some((subject) => subject.grade >= 4 && subject.status === 'Failed'));
});
