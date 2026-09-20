const mongoose = require('mongoose');

const facultyEvaluationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },

    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    evaluationStatus: {
      type: String,
      enum: ['eligible', 'not_eligible', 'for_review'],
      required: true
    },

    reasons: {
      type: [String],
      default: []
    },

    remarks: {
      type: String,
      trim: true
    },

    evaluatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
  timestamps: true,
  collection: 'faculty_evaluations'
}
);

module.exports = mongoose.model(
  'FacultyEvaluation',
  facultyEvaluationSchema
);