const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Student = require('../models/Student');
const AcademicRecord = require('../models/AcademicRecord');
const { validateAndNormalizeAcademicRecord } = require('../utils/academicRecord');

const STUDENT_TEST_RECORDS = [
  {
    academicYear: '2024-2025',
    semester: '2nd Semester',
    subjects: [
      { subjectCode: 'IT 121', subjectName: 'Computer Programming 2', units: 3, grade: 1.75, isMajor: true, status: 'Completed' },
      { subjectCode: 'IT 122', subjectName: 'Discrete Structures', units: 3, grade: 2.00, isMajor: true, status: 'Completed' },
      { subjectCode: 'GE 104', subjectName: 'Mathematics in the Modern World', units: 3, grade: 1.50, isMajor: false, status: 'Completed' }
    ]
  },
  {
    academicYear: '2025-2026',
    semester: '1st Semester',
    subjects: [
      { subjectCode: 'IT 201', subjectName: 'Data Structures and Algorithms', units: 3, grade: 2.00, isMajor: true, status: 'Completed' },
      { subjectCode: 'IT 202', subjectName: 'Object-Oriented Programming', units: 3, grade: 1.50, isMajor: true, status: 'Completed' },
      { subjectCode: 'GE 201', subjectName: 'Science, Technology and Society', units: 3, grade: 2.00, isMajor: false, status: 'Completed' }
    ]
  },
  {
    academicYear: '2025-2026',
    semester: '2nd Semester',
    subjects: [
      { subjectCode: 'IT 211', subjectName: 'Database Systems', units: 3, grade: 1.50, isMajor: true, status: 'Completed' },
      { subjectCode: 'IT 212', subjectName: 'Web Systems and Technologies', units: 3, grade: 1.75, isMajor: true, status: 'Completed' },
      { subjectCode: 'GE 205', subjectName: 'Ethics', units: 3, grade: 1.50, isMajor: false, status: 'Completed' }
    ]
  }
];

const seedStudentTestAcademicRecords = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI);

  try {
    const user = await User.findOne({ username: 'student.test', role: 'student' }).select('_id');
    if (!user) throw new Error('student.test student account was not found');

    const student = await Student.findOne({ userId: user._id }).select('_id institutionId');
    if (!student) throw new Error('student.test has no linked Student profile');

    const results = [];
    for (const candidate of STUDENT_TEST_RECORDS) {
      const normalized = validateAndNormalizeAcademicRecord(candidate);
      if (normalized.error) throw new Error(normalized.error);

      const result = await AcademicRecord.updateOne(
        {
          studentId: student._id,
          academicYear: normalized.value.academicYear,
          semester: normalized.value.semester
        },
        {
          $setOnInsert: {
            studentId: student._id,
            ...normalized.value
          }
        },
        { upsert: true }
      );
      results.push({
        academicYear: normalized.value.academicYear,
        semester: normalized.value.semester,
        outcome: result.upsertedCount === 1 ? 'created' : 'already existed'
      });
    }

    console.log(JSON.stringify({ username: 'student.test', institutionId: student.institutionId, records: results }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  seedStudentTestAcademicRecords().catch((error) => {
    console.error(`Unable to seed student.test academic records: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { STUDENT_TEST_RECORDS, seedStudentTestAcademicRecords };
