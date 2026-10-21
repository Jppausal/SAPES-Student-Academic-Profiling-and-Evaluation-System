const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    program: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    totalStudents: { type: Number, required: true, min: 0, default: 0 },
    profilesAwaitingEvaluation: { type: Number, required: true, min: 0, default: 0 },
    pendingEnrollmentDecisions: { type: Number, required: true, min: 0, default: 0 },
    evaluatedProfiles: { type: Number, required: true, min: 0, default: 0 },
    lastSyncedAt: { type: Date, default: null }
  },
  {
    timestamps: true,
    collection: 'departments'
  }
);

module.exports = mongoose.models.Department
  || mongoose.model('Department', departmentSchema);
