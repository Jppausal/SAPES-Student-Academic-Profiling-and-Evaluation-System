const test = require('node:test');
const assert = require('node:assert/strict');

const { buildStudentSearchFilter } = require('../utils/studentSearch');

test('authorized record search includes profiles regardless of duplicated student account status', () => {
  const filter = buildStudentSearchFilter('2401105814');

  assert.equal(Object.hasOwn(filter, 'accountStatus'), false);
  assert.equal(filter.$or[0].institutionId.test('2401105814'), true);
});

test('student search treats regex characters as literal text', () => {
  const filter = buildStudentSearchFilter('TEST.0001');

  assert.equal(filter.$or[0].institutionId.test('TEST.0001'), true);
  assert.equal(filter.$or[0].institutionId.test('TESTX0001'), false);
});
