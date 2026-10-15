const mongoose = require('mongoose');
const path = require('node:path');
const Student = require('../models/Student');
const User = require('../models/User');

// Only names missing from Student are filled. User remains authoritative for account status.
function planBackfill(student, user) {
  if (!user || user.role !== 'student') return {};
  const updates = {};
  if (['active', 'inactive', 'suspended'].includes(user.accountStatus)
      && student.accountStatus !== user.accountStatus) {
    updates.accountStatus = user.accountStatus;
  }
  for (const field of ['firstName', 'lastName']) {
    const current = student.personalInformation?.[field];
    if ((current == null || typeof current === 'string' && !current.trim())
        && typeof user[field] === 'string' && user[field].trim()) {
      updates[`personalInformation.${field}`] = user[field].trim();
    }
  }
  return updates;
}

async function backfillStudentIdentity({ apply = false } = {}) {
  const summary = { mode: apply ? 'apply' : 'dry-run', inspected: 0, eligible: 0, updated: 0, statusFields: 0, nameFields: 0, skippedUnlinked: 0 };
  for await (const student of Student.find().select('userId accountStatus personalInformation.firstName personalInformation.lastName').lean().cursor()) {
    summary.inspected++;
    const user = student.userId
      ? await User.findById(student.userId).select('role accountStatus firstName lastName').lean()
      : null;
    if (!user || user.role !== 'student') { summary.skippedUnlinked++; continue; }
    const updates = planBackfill(student, user);
    if (!Object.keys(updates).length) continue;
    summary.eligible++;
    summary.statusFields += Number('accountStatus' in updates);
    summary.nameFields += Object.keys(updates).filter(key => key.startsWith('personalInformation.')).length;
    if (!apply) continue;
    const filter = { _id: student._id, userId: student.userId };
    for (const key of Object.keys(updates)) {
      const current = key === 'accountStatus' ? student.accountStatus : student.personalInformation?.[key.split('.')[1]];
      // Do not overwrite a field changed after this document was inspected.
      filter[key] = current === undefined ? { $exists: false } : current;
    }
    const result = await Student.updateOne(filter, { $set: updates });
    summary.updated += result.modifiedCount;
  }
  return summary;
}

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  (async () => {
    const uri = process.env.ATLAS_URI || process.env.MONGO_URI;
    if (!uri) throw new Error('Database URI is required');
    await mongoose.connect(uri);
    console.log(JSON.stringify(await backfillStudentIdentity({ apply: process.argv.includes('--apply') })));
  })().catch(() => {
    console.error('Student identity backfill failed; no credentials or student data are logged.');
    process.exitCode = 1;
  }).finally(() => mongoose.disconnect());
}

module.exports = { planBackfill, backfillStudentIdentity };
