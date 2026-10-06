const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: { type: String, enum: ['quiz', 'lab', 'exam', 'other'], required: true },
  score: { type: Number, min: 0, required: true },
  possiblePoints: { type: Number, min: 1, required: true },
  submitted: { type: Boolean, default: true },
  dueDate: Date
});

const attendanceSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'late', 'absent', 'excused'], required: true },
  notes: { type: String, trim: true, maxlength: 500 },
  excuseLetter: { type: String, trim: true, maxlength: 200 }
});

const rubricSchema = new mongoose.Schema({
  competency: { type: String, required: true, trim: true },
  rating: { type: Number, min: 0, max: 5, required: true },
  maxRating: { type: Number, min: 1, max: 5, default: 5 },
  notes: { type: String, trim: true, maxlength: 1000 }
});

const remarkSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now }
});

const courseEvaluationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      unique: true
    },
    academicYear: { type: String, default: '2026-2027' },
    semester: { type: String, default: '1st Semester' },
    assessments: { type: [assessmentSchema], default: [] },
    attendanceLogs: { type: [attendanceSchema], default: [] },
    rubricScores: { type: [rubricSchema], default: [] },
    facultyRemarks: { type: [remarkSchema], default: [] },
    internalNotes: { type: String, trim: true, maxlength: 5000, default: '' }
  },
  { timestamps: true, collection: 'course_evaluations' }
);

module.exports = mongoose.model('CourseEvaluation', courseEvaluationSchema);