const mongoose = require('mongoose');
const Student = require('../models/Student');
const AcademicRecord = require('../models/AcademicRecord');
const { connectCloudDatabase } = require('../utils/database');
const { validateAndNormalizeAcademicRecord } = require('../utils/academicRecord');

const DEMO_INSTITUTION_ID = '2021301234';
const DEMO_ACADEMIC_RECORD = {
  academicYear: '2025-2026',
  semester: '1st Semester',
  subjects: [
    { subjectCode: 'IT 301', subjectName: 'Database Management Systems', units: 3, grade: 1.75, isMajor: true, status: 'Completed' },
    { subjectCode: 'IT 302', subjectName: 'Systems Analysis and Design', units: 3, grade: 2.00, isMajor: true, status: 'Completed' },
    { subjectCode: 'IT 303', subjectName: 'Computer Networks', units: 3, grade: 1.50, isMajor: true, status: 'Completed' },
    { subjectCode: 'IT 304', subjectName: 'Web Systems and Technologies', units: 3, grade: 1.75, isMajor: true, status: 'Completed' },
    { subjectCode: 'IT 305', subjectName: 'Operating Systems', units: 3, grade: 2.25, isMajor: true, status: 'Completed' },
    { subjectCode: 'IT 306', subjectName: 'Human-Computer Interaction', units: 3, grade: 1.50, isMajor: true, status: 'Completed' },
    { subjectCode: 'IT 307', subjectName: 'Software Engineering', units: 3, grade: 2.00, isMajor: true, status: 'Completed' },
    { subjectCode: 'GE 201', subjectName: 'Science, Technology and Society', units: 3, grade: 1.75, isMajor: false, status: 'Completed' },
    { subjectCode: 'GE 202', subjectName: 'Purposive Communication', units: 3, grade: 1.50, isMajor: false, status: 'Completed' }
  ]
};

const seedStudentAcademicDemoRecord = async () => {
  const normalized = validateAndNormalizeAcademicRecord(DEMO_ACADEMIC_RECORD);
  if (normalized.error) throw new Error(normalized.error);

  await connectCloudDatabase();
  try {
    const student = await Student.findOne({ institutionId: DEMO_INSTITUTION_ID }).select('_id institutionId');
    if (!student) {
      throw new Error(`Demo student ${DEMO_INSTITUTION_ID} was not found in the student users collection`);
    }

    const result = await AcademicRecord.updateOne(
      {
        studentId: student._id,
        academicYear: normalized.value.academicYear,
        semester: normalized.value.semester
      },
      {
        $setOnInsert: {
          studentId: student._id,
          isDemo: true,
          ...normalized.value
        }
      },
      { upsert: true }
    );

    const outcome = result.upsertedCount === 1 ? 'created' : 'already existed; left unchanged';
    console.log(`Demo academic record ${outcome} for ${student.institutionId}. Do not treat these fictional grades as official.`);
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  seedStudentAcademicDemoRecord().catch((error) => {
    console.error(`Unable to seed the student demo academic record: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { DEMO_ACADEMIC_RECORD, DEMO_INSTITUTION_ID, seedStudentAcademicDemoRecord };
