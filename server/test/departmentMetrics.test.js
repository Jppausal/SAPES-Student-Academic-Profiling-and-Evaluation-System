const assert = require('node:assert/strict');
const test = require('node:test');
const Department = require('../models/Department');
const Student = require('../models/Student');
const { syncDepartmentMetrics } = require('../utils/departmentMetrics');

const department = {
  code: 'IT',
  name: 'Information Technology',
  program: 'Bachelor of Information Technology'
};

test('synchronizes evaluation and enrollment metrics independently', async (t) => {
  const originalAggregate = Student.aggregate;
  const originalFindOneAndUpdate = Department.findOneAndUpdate;
  const counts = {
    totalStudents: 6,
    evaluatedProfiles: 2,
    pendingEnrollmentDecisions: 3,
    profilesAwaitingEvaluation: 3
  };
  let pipeline;
  let update;
  Student.aggregate = async (value) => {
    pipeline = value;
    return [counts];
  };
  Department.findOneAndUpdate = (filter, document, options) => {
    update = { filter, document, options };
    return { lean: async () => ({ ...filter, ...document.$set }) };
  };
  t.after(() => {
    Student.aggregate = originalAggregate;
    Department.findOneAndUpdate = originalFindOneAndUpdate;
  });

  const result = await syncDepartmentMetrics(department);

  assert.deepEqual(pipeline[0].$match, {
    accountStatus: 'active',
    'classification.program': department.program
  });
  assert.equal(pipeline[1].$lookup.from, 'faculty_evaluations');
  assert.equal(result.totalStudents, 6);
  assert.equal(result.pendingEnrollmentDecisions, 3);
  assert.equal(result.evaluatedProfiles, 2);
  assert.equal(result.profilesAwaitingEvaluation, 3);
  const pendingMetric = JSON.stringify(pipeline[2].$group.pendingEnrollmentDecisions);
  assert.match(pendingMetric, /enrollmentStatus/);
  assert.doesNotMatch(pendingMetric, /facultyEvaluations/);
  assert.equal(update.filter.code, department.code);
  assert.equal(update.document.$set.name, department.name);
  assert.equal(update.options.upsert, true);
});

test('rejects department metrics larger than the active student total', async (t) => {
  const originalAggregate = Student.aggregate;
  const originalFindOneAndUpdate = Department.findOneAndUpdate;
  Student.aggregate = async () => [{
    totalStudents: 4,
    evaluatedProfiles: 2,
    pendingEnrollmentDecisions: 5,
    profilesAwaitingEvaluation: 0
  }];
  Department.findOneAndUpdate = () => {
    assert.fail('invalid metrics must not be persisted');
  };
  t.after(() => {
    Student.aggregate = originalAggregate;
    Department.findOneAndUpdate = originalFindOneAndUpdate;
  });

  await assert.rejects(
    syncDepartmentMetrics(department),
    /Department metrics are outside the student total for IT/
  );
});
