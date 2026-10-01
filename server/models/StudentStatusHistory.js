const mongoose = require('mongoose');

const studentStatusHistorySchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },

    status: {
      type: String,
      required: true,
      trim: true
    },

    reason: {
      type: String,
      trim: true
    },

    effectiveDate: {
      type: Date,
      required: true
    },

    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    remarks: {
      type: String,
      trim: true
    }
  },
  {
  timestamps: true,
  collection: 'student_status_history'
}
);

module.exports = mongoose.model(
  'StudentStatusHistory',
  studentStatusHistorySchema
);