const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeImportRow } = require('../utils/bulkStudentImport');
const { getActiveAcademicPeriod, DEFAULT_SETTINGS } = require('../utils/academicPeriodSettings');

test('A115: normalizeImportRow validates student fields and flags errors', () => {
  const validRow = {
    institutionId: '2023-9999',
    firstName: 'Maria',
    lastName: 'Santos',
    program: 'Bachelor of Information Technology',
    yearLevel: '2',
    isIP: 'yes',
    academicStatus: 'Regular'
  };
  const normalized = normalizeImportRow(validRow, 0);
  assert.equal(normalized.isValid, true);
  assert.equal(normalized.institutionId, '2023-9999');
  assert.equal(normalized.data.firstName, 'Maria');
  assert.equal(normalized.data.isIP, true);
  assert.equal(normalized.data.yearLevel, 2);

  const invalidRow = {
    firstName: 'Incomplete'
  };
  const invalidNormalized = normalizeImportRow(invalidRow, 1);
  assert.equal(invalidNormalized.isValid, false);
  assert.ok(invalidNormalized.errors.some(e => e.includes('Student ID')));
  assert.ok(invalidNormalized.errors.some(e => e.includes('Last Name')));
});

test('A116: AcademicPeriodSettings returns defaults when not configured or offline', async () => {
  const period = await getActiveAcademicPeriod();
  assert.equal(period.schoolYear, DEFAULT_SETTINGS.schoolYear);
  assert.equal(period.semester, DEFAULT_SETTINGS.semester);
  assert.equal(period.isTermGradesLocked, false);
  assert.equal(period.evaluationWindowOpen, true);
});
