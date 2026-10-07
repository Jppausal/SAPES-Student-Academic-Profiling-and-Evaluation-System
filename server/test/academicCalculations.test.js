const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateMajorSubjectGwa, withMajorSubjectGwa, getLatestAcademicPeriod } = require('../utils/academicCalculations');

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

test('keeps selected-period and cumulative GWA scopes explicit', () => {
  const latest = {
    academicYear: '2025-2026',
    semester: '2nd Semester',
    subjects: [{ grade: 1.25, units: 3, isMajor: true, status: 'Completed' }]
  };
  const earlier = {
    academicYear: '2025-2026',
    semester: '1st Semester',
    subjects: [{ grade: 1.35, units: 6, isMajor: true, status: 'Completed' }]
  };

  assert.equal(withMajorSubjectGwa([latest])[0].majorSubjectGwa, 1.25);
  assert.equal(calculateMajorSubjectGwa([latest, earlier]), 1.32);
});

test('identifies the latest period independently of record order', () => {
  const records = [
    { academicYear: '2024-2025', semester: '2nd Semester', subjects: [{ isMajor: true, status: 'Completed', grade: 1.5, units: 3 }] },
    { academicYear: '2025-2026', semester: '1st Semester', subjects: [{ isMajor: true, status: 'Completed', grade: 1.25, units: 3 }] },
    { academicYear: '2025-2026', semester: '2nd Semester', subjects: [{ isMajor: true, status: 'Completed', grade: 1.3, units: 3 }] }
  ];

  assert.deepEqual(getLatestAcademicPeriod(records), {
    academicYear: '2025-2026',
    semester: '2nd Semester',
    majorSubjectGwa: 1.3
  });
});
