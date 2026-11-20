const mongoose = require('mongoose');

const RecordLockSchema = new mongoose.Schema(
  {
    resourceType: {
      type: String,
      required: true,
      enum: ['STUDENT', 'ACADEMIC_RECORD', 'FACULTY_EVALUATION', 'REPORT'],
      default: 'STUDENT',
      index: true
    },
    resourceId: {
      type: String,
      required: true,
      index: true
    },
    lockMode: {
      type: String,
      required: true,
      enum: ['EXCLUSIVE', 'SHARED'],
      default: 'EXCLUSIVE'
    },
    lockedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
      },
      username: { type: String, required: true },
      role: { type: String, required: true },
      fullName: { type: String, default: '' }
    },
    transactionId: {
      type: String,
      required: true,
      index: true
    },
    lockToken: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    reason: {
      type: String,
      default: 'Transaction in Progress'
    },
    acquiredAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // MongoDB TTL index: removes expired locks automatically
    }
  },
  {
    timestamps: true,
    collection: 'record_locks'
  }
);

RecordLockSchema.index({ resourceType: 1, resourceId: 1, expiresAt: 1 });

module.exports = mongoose.model('RecordLock', RecordLockSchema);
