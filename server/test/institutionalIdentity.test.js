const assert = require('node:assert/strict');
const test = require('node:test');
const {
  extractStudentInstitutionId,
  isInstitutionalEmail,
  normalizeInstitutionalEmail,
  resolveStudentInstitutionIdentity
} = require('../utils/institutionalIdentity');

test('normalizes institutional emails and extracts the student ID', () => {
  assert.equal(
    normalizeInstitutionalEmail('  2401105814@STUDENT.BUKSU.EDU.PH  '),
    '2401105814@student.buksu.edu.ph'
  );
  assert.equal(
    extractStudentInstitutionId('2401105814@student.buksu.edu.ph'),
    '2401105814'
  );
  assert.equal(extractStudentInstitutionId('alex@student.buksu.edu.ph'), null);
  assert.equal(extractStudentInstitutionId('2401105814@gmail.com'), null);
});

test('recognizes BukSU institutional email domains', () => {
  assert.equal(isInstitutionalEmail('registrar@buksu.edu.ph'), true);
  assert.equal(isInstitutionalEmail('faculty.member@faculty.buksu.edu.ph'), true);
  assert.equal(isInstitutionalEmail('registrar@gmail.com'), false);
});

test('derives one canonical student identity and rejects mismatched input', () => {
  assert.deepEqual(
    resolveStudentInstitutionIdentity({
      email: '2401105814@student.buksu.edu.ph'
    }),
    {
      email: '2401105814@student.buksu.edu.ph',
      institutionId: '2401105814',
      username: '2401105814'
    }
  );

  assert.match(
    resolveStudentInstitutionIdentity({
      email: '2401105814@student.buksu.edu.ph',
      studentNumber: '2401109999'
    }).error,
    /must match/
  );
});
