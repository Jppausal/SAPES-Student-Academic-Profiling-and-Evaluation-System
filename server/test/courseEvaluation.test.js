const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateCourseMetrics, validateCourseEvaluation } = require('../utils/courseEvaluation');

test('validates and normalizes course evaluation entries', () => {
  const result = validateCourseEvaluation({
    assessments: [{ title: ' Quiz 1 ', category: 'quiz', score: 8, possiblePoints: 10, submitted: true }],
    attendanceLogs: [{ date: '2026-09-01', status: 'present' }],
    rubricScores: [{ competency: '  Problem solving ', rating: 4, maxRating: 5 }],
    facultyRemarks: [{ text: '  Good progress ' }],
    internalNotes: '  Follow up next week '
  });

  assert.equal(result.error, undefined);
  assert.equal(result.value.assessments[0].title, 'Quiz 1');
  assert.equal(result.value.rubricScores[0].competency, 'Problem solving');
  assert.equal(result.value.internalNotes, 'Follow up next week');
});

test('rejects invalid assessment scores and attendance statuses', () => {
  const invalidScore = validateCourseEvaluation({
    assessments: [{ title: 'Exam', category: 'exam', score: 11, possiblePoints: 10 }]
  });
  const invalidAttendance = validateCourseEvaluation({
    attendanceLogs: [{ date: '2026-09-01', status: 'unknown' }]
  });

  assert.equal(invalidScore.error, 'assessments[0].possiblePoints must be positive and at least the score');
  assert.equal(invalidAttendance.error, 'attendanceLogs[0].status is invalid');
});

test('calculates grade, attendance, submissions, and cohort percentile', () => {
  const metrics = calculateCourseMetrics({
    assessments: [
      { score: 8, possiblePoints: 10, submitted: true },
      { score: 0, possiblePoints: 10, submitted: false }
    ],
    attendanceLogs: [
      { status: 'present' },
      { status: 'late' },
      { status: 'absent' },
      { status: 'excused' }
    ]
  }, [60, 80, 90]);

  assert.deepEqual(metrics, {
    attendanceRate: 66.7,
    classPercentile: 67,
    runningGrade: 80,
    submissionRate: 50
  });
});