const test = require('node:test');
const assert = require('node:assert/strict');

const { validateAndNormalizeStudentProfile } = require('../utils/studentProfile');

test('normalizes allowed self-service fields', () => {
  const result = validateAndNormalizeStudentProfile({
    personalInformation: {
      firstName: '  Ana  ',
      suffix: ' Jr. ',
      birthDate: '2004-05-06'
    },
    classification: {
      isShifter: true,
      isTransferee: false
    },
    religiousInformation: {
      religion: '  Catholic  '
    }
  }, { allowClassification: true });

  assert.equal(result.error, undefined);
  assert.equal(result.value.personalInformation.firstName, 'Ana');
  assert.equal(result.value.personalInformation.suffix, 'Jr.');
  assert.equal(result.value.personalInformation.birthDate.toISOString(), '2004-05-06T00:00:00.000Z');
  assert.equal(result.value.classification.isShifter, true);
  assert.equal(result.value.religiousInformation.religion, 'Catholic');
});

test('accepts a College of Technologies program and rejects unknown programs', () => {
  const validResult = validateAndNormalizeStudentProfile({
    classification: { program: 'Food Technology' }
  }, { allowClassification: true });
  const invalidResult = validateAndNormalizeStudentProfile({
    classification: { program: 'Unlisted Program' }
  }, { allowClassification: true });

  assert.equal(validResult.error, undefined);
  assert.equal(validResult.value.classification.program, 'Food Technology');
  assert.equal(invalidResult.error, 'classification.program must be a College of Technologies program');
});

test('rejects protected and unsupported fields', () => {
  const protectedResult = validateAndNormalizeStudentProfile({ institutionId: 'changed-id' });
  const nestedResult = validateAndNormalizeStudentProfile({
    classification: { role: 'admin' }
  }, { allowClassification: true });

  assert.equal(protectedResult.error, 'institutionId is system-controlled or not editable');
  assert.equal(nestedResult.error, 'classification.role is not editable');
});

test('rejects classification through student self-service validation', () => {
  const result = validateAndNormalizeStudentProfile({ classification: { program: 'Bachelor of Information Technology' } });
  assert.equal(result.error, 'classification.program is system-controlled or not editable');
});

test('protects enrollment assignment and institutional email from student self-service', () => {
  const enrollmentResult = validateAndNormalizeStudentProfile({
    enrollmentInformation: { course: 'Bachelor of Information Technology' }
  });
  const emailResult = validateAndNormalizeStudentProfile({
    contactInformation: { institutionalEmail: 'changed@student.buksu.edu.ph' }
  });
  const mobileResult = validateAndNormalizeStudentProfile({
    contactInformation: { mobileNumber: '09171234567' }
  });

  assert.equal(enrollmentResult.error, 'enrollmentInformation is system-controlled or not editable');
  assert.equal(emailResult.error, 'contactInformation.institutionalEmail is system-controlled or not editable');
  assert.equal(mobileResult.value.contactInformation.mobileNumber, '09171234567');
});

test('rejects incorrect field types and invalid dates', () => {
  const booleanResult = validateAndNormalizeStudentProfile({
    classification: { isPWD: 'yes' }
  }, { allowClassification: true });
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

test('normalizes expanded student context while keeping identifiers protected', () => {
  const result = validateAndNormalizeStudentProfile({
    enrollmentInformation: { course: ' BSIT ', curriculum: '2024-2025 BSIT' },
    contactInformation: { institutionalEmail: ' student@buksu.edu.ph ' },
    addresses: { presentAddress: { barangay: ' Malaybalay ', province: ' Bukidnon ', country: ' Philippines ', zipCode: '8700' } },
    educationalBackground: { seniorHigh: ' BukSU Integrated School ' },
    healthInformation: { hasRelevantHealthConcern: true, accommodationRequired: true, accommodationNotes: 'Accessible seating' }
  }, { allowEnrollmentInformation: true, allowInstitutionalContact: true });

  assert.equal(result.error, undefined);
  assert.equal(result.value.enrollmentInformation.course, 'BSIT');
  assert.equal(result.value.contactInformation.institutionalEmail, 'student@buksu.edu.ph');
  assert.equal(result.value.addresses.presentAddress.barangay, 'Malaybalay');
  assert.equal(result.value.addresses.presentAddress.country, 'Philippines');
  assert.equal(result.value.healthInformation.accommodationRequired, true);
});

test('validates structured health conditions and none exclusivity', () => {
  const valid = validateAndNormalizeStudentProfile({ healthInformation: { hasRelevantHealthConcern: true, conditions: ['Asthma', 'Allergies'], allergyDetails: 'Dust' } });
  const invalid = validateAndNormalizeStudentProfile({ healthInformation: { hasRelevantHealthConcern: true, conditions: ['None', 'Asthma'] } });
  assert.deepEqual(valid.value.healthInformation.conditions, ['Asthma', 'Allergies']);
  assert.equal(invalid.error, 'healthInformation.conditions cannot include None with another condition');
});

test('accepts valid recurring spiritual activity times and rejects invalid ranges', () => {
  const valid = validateAndNormalizeStudentProfile({ religiousInformation: { shareSpiritualSchedule: true, spiritualActivities: [{ dayOfWeek: 'Thursday', startTime: '18:00', endTime: '20:00' }] } });
  const invalid = validateAndNormalizeStudentProfile({ religiousInformation: { spiritualActivities: [{ dayOfWeek: 'Thursday', startTime: '20:00', endTime: '18:00' }] } });
  assert.equal(valid.error, undefined);
  assert.equal(valid.value.religiousInformation.spiritualActivities[0].startTime, '18:00');
  assert.equal(invalid.error, 'Each spiritual activity must have a valid day and time range');
});

test('student self-service accepts independent classification flags without administrative options', () => {
  const classification = { isShifter: true, isTransferee: true, isIP: false, isPWD: true };
  const result = validateAndNormalizeStudentProfile({ classification });
  assert.equal(result.error, undefined);
  assert.deepEqual(result.value.classification, classification);
  assert.deepEqual(validateAndNormalizeStudentProfile({ classification: { isShifter: false } }).value.classification, { isShifter: false });
});

test('student classification edits reject restricted configuration and malformed flags', () => {
  for (const field of ['program', 'studentType']) {
    assert.ok(validateAndNormalizeStudentProfile({ classification: { isShifter: true, [field]: 'forged' } }).error);
  }
  for (const field of ['isShifter', 'isTransferee', 'isIP', 'isPWD']) {
    assert.ok(validateAndNormalizeStudentProfile({ classification: { [field]: 'true' } }).error);
  }
  for (const field of ['institutionId', 'userId', 'academicStatus', 'grades', 'GWA']) {
    assert.ok(validateAndNormalizeStudentProfile({ classification: { isShifter: true }, [field]: 'forged' }).error);
  }
});

test('T108: permits updating personal, contact, religion, and shifter/transferee flags while rejecting all protected and system-controlled fields', () => {
  const updatePayload = {
    personalInformation: {
      firstName: 'Maria',
      civilStatus: 'Single'
    },
    contactInformation: {
      mobileNumber: '09181234567'
    },
    religiousInformation: {
      religion: 'Protestant / Other Christian'
    },
    classification: {
      isShifter: true,
      isTransferee: false
    }
  };

  const normalized = validateAndNormalizeStudentProfile(updatePayload);
  assert.equal(normalized.error, undefined);
  assert.equal(normalized.value.personalInformation.firstName, 'Maria');
  assert.equal(normalized.value.personalInformation.civilStatus, 'Single');
  assert.equal(normalized.value.contactInformation.mobileNumber, '09181234567');
  assert.equal(normalized.value.religiousInformation.religion, 'Protestant / Other Christian');
  assert.equal(normalized.value.classification.isShifter, true);
  assert.equal(normalized.value.classification.isTransferee, false);

  const protectedFields = [
    'userId',
    'institutionId',
    'role',
    'grades',
    'academicRecord',
    'academicRecords',
    'GWA',
    'academicStatus',
    'createdAt',
    'updatedAt',
    'timestamps'
  ];

  for (const field of protectedFields) {
    const rejected = validateAndNormalizeStudentProfile({ [field]: 'unauthorized' });
    assert.ok(rejected.error, `Expected ${field} to be rejected`);
    assert.match(rejected.error, /system-controlled or not editable/);
  }

  assert.ok(validateAndNormalizeStudentProfile({ classification: { program: 'Bachelor of Information Technology' } }).error);
  assert.ok(validateAndNormalizeStudentProfile({ classification: { studentType: 'Regular' } }).error);
  assert.ok(validateAndNormalizeStudentProfile({ contactInformation: { institutionalEmail: 'tampered@student.buksu.edu.ph' } }).error);
  assert.ok(validateAndNormalizeStudentProfile({ enrollmentInformation: { course: 'BSIT' } }).error);
});
