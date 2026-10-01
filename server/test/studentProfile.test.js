const test = require('node:test');
const assert = require('node:assert/strict');

const { validateAndNormalizeStudentProfile } = require('../utils/studentProfile');

test('normalizes allowed self-service fields', () => {
  const result = validateAndNormalizeStudentProfile({
    personalInformation: {
      firstName: '  Ana  ',
      birthDate: '2004-05-06'
    },
    classification: {
      isShifter: true,
      isTransferee: false
    },
    religiousInformation: {
      religion: '  Catholic  '
    }
  });

  assert.equal(result.error, undefined);
  assert.equal(result.value.personalInformation.firstName, 'Ana');
  assert.equal(result.value.personalInformation.birthDate.toISOString(), '2004-05-06T00:00:00.000Z');
  assert.equal(result.value.classification.isShifter, true);
  assert.equal(result.value.religiousInformation.religion, 'Catholic');
});

test('accepts a College of Technologies program and rejects unknown programs', () => {
  const validResult = validateAndNormalizeStudentProfile({
    classification: { program: 'Food Technology' }
  });
  const invalidResult = validateAndNormalizeStudentProfile({
    classification: { program: 'Unlisted Program' }
  });

  assert.equal(validResult.error, undefined);
  assert.equal(validResult.value.classification.program, 'Food Technology');
  assert.equal(invalidResult.error, 'classification.program must be a College of Technologies program');
});

test('rejects protected and unsupported fields', () => {
  const protectedResult = validateAndNormalizeStudentProfile({ institutionId: 'changed-id' });
  const nestedResult = validateAndNormalizeStudentProfile({
    classification: { role: 'admin' }
  });

  assert.equal(protectedResult.error, 'institutionId is system-controlled or not editable');
  assert.equal(nestedResult.error, 'classification.role is not editable');
});

test('rejects incorrect field types and invalid dates', () => {
  const booleanResult = validateAndNormalizeStudentProfile({
    classification: { isPWD: 'yes' }
  });
  const dateResult = validateAndNormalizeStudentProfile({
    personalInformation: { birthDate: 'not-a-date' }
  });

  assert.equal(booleanResult.error, 'classification.isPWD must be a boolean');
  assert.equal(dateResult.error, 'personalInformation.birthDate must be a valid date');
});

test('keeps academic status outside ordinary profile updates', () => {
  const result = validateAndNormalizeStudentProfile({
    academicStatus: { currentStatus: 'probation' }
  });

  assert.equal(result.error, 'academicStatus is system-controlled or not editable');
});
