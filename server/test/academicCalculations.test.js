const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateMajorSubjectGwa } = require('../utils/academicCalculations');

test('calculates a unit-weighted major-subject GWA', () => {
  const result = calculateMajorSubjectGwa([{
    subjects: [
      { grade: 1, units: 3, isMajor: true, status: 'Completed' },
      { grade: 2, units: 6, isMajor: true, status: 'Completed' },
      { grade: 1, units: 3, isMajor: false, status: 'Completed' }
    ]
  }]);

  assert.equal(result, 1.67);
});

test('excludes dropped, ungraded, and zero-unit subjects', () => {
  const result = calculateMajorSubjectGwa([{
    subjects: [
      { grade: 1, units: 3, isMajor: true, status: 'Dropped' },
      { grade: 0, units: 3, isMajor: true, status: 'Ongoing' },
      { grade: 1.5, units: 0, isMajor: true, status: 'Completed' }
    ]
  }]);

  assert.equal(result, 0);
});
