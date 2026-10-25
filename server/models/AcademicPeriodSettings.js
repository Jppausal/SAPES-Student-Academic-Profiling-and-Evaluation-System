const mongoose = require('mongoose');

const academicPeriodSettingsSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: 'active_period'
    },
    schoolYear: {
      type: String,
      required: true,
      default: '2025-2026',
      trim: true
    },
    semester: {
      type: String,
      required: true,
      enum: ['1st Semester', '2nd Semester', 'Midyear'],
      default: '1st Semester',
      trim: true
    },
    isTermGradesLocked: {
      type: Boolean,
      default: false
    },
    evaluationWindowOpen: {
      type: Boolean,
      default: true
    },
    evaluationDeadline: {
      type: Date,
      default: null
    },
    announcementMessage: {
      type: String,
      default: '',
      trim: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser'
    }
  },
  {
    timestamps: true,
    collection: 'academic_period_settings'
  }
);

module.exports = mongoose.model('AcademicPeriodSettings', academicPeriodSettingsSchema);
