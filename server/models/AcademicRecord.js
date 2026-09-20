const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    subjectCode: {
      type: String,
      required: true,
      trim: true
    },

    subjectName: {
      type: String,
      required: true,
      trim: true
    },

    units: {
      type: Number,
      required: true,
      min: 0
    },

    grade: {
      type: Number,
      required: true
    },

    isMajor: {
      type: Boolean,
      required: true,
      default: false
    },

    status: {
      type: String,
      required: true,
      trim: true
    }
  },
  { _id: false }
);

const academicRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },

    academicYear: {
      type: String,
      required: true,
      trim: true
    },

    semester: {
      type: String,
      required: true,
      trim: true
    },

    subjects: {
      type: [subjectSchema],
      required: true,
      default: []
    }
  },
  {
  timestamps: true,
  collection: 'academic_records'
}
);

module.exports = mongoose.model('AcademicRecord', academicRecordSchema);