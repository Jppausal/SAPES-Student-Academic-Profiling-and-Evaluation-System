const assert = require('node:assert/strict');
const test = require('node:test');
const {
  DEPARTMENTS,
  buildStudentDepartmentFilter,
  getEnrollmentOfficerDepartment
} = require('../utils/departmentAccess');

test('resolves an enrollment officer department from its normalized code', () => {
  assert.equal(getEnrollmentOfficerDepartment({
    isVerifiedEnrollmentOfficer: true,
    departmentCode: ' it '
  }), DEPARTMENTS[0]);
});

test('scopes a verified officer filter to exactly one program', () => {
  const filter = buildStudentDepartmentFilter({
    isVerifiedEnrollmentOfficer: true,
    departmentCode: 'IT'
  }, { institutionId: '2021301234' });

  assert.deepEqual(filter, {
    $and: [
      { institutionId: '2021301234' },
      { 'classification.program': 'Bachelor of Information Technology' }
    ]
  });
});

test('rejects a verified officer without a configured department', () => {
  assert.equal(buildStudentDepartmentFilter({
    isVerifiedEnrollmentOfficer: true,
    departmentCode: 'UNKNOWN'
  }, { institutionId: '2021301234' }), null);
});

test('does not restrict regular faculty filters', () => {
  const filter = { institutionId: '2021301234' };

  assert.equal(buildStudentDepartmentFilter({ role: 'faculty' }, filter), filter);
  assert.equal(getEnrollmentOfficerDepartment({ role: 'faculty' }), undefined);
});
