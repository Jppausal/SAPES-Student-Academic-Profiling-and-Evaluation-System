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

test('synchronizes disjoint department metric categories', async (t) => {
  const originalAggregate = Student.aggregate;
  const originalFindOneAndUpdate = Department.findOneAndUpdate;
  const counts = {
    totalStudents: 6,
    evaluatedProfiles: 2,
    pendingEnrollmentDecisions: 1,
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
  assert.equal(
    result.profilesAwaitingEvaluation
      + result.pendingEnrollmentDecisions
      + result.evaluatedProfiles,
    result.totalStudents
  );
  assert.equal(update.filter.code, department.code);
  assert.equal(update.document.$set.name, department.name);
  assert.equal(update.options.upsert, true);
});

test('fails rather than storing overlapping or incomplete metric totals', async (t) => {
  const originalAggregate = Student.aggregate;
  const originalFindOneAndUpdate = Department.findOneAndUpdate;
  Student.aggregate = async () => [{
    totalStudents: 4,
    evaluatedProfiles: 2,
    pendingEnrollmentDecisions: 1,
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
    /Department metrics do not partition students for IT/
  );
});
