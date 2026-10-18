const mongoose = require('mongoose');
const Student = require('../models/Student');
const AcademicRecord = require('../models/AcademicRecord');
const { connectCloudDatabase } = require('../utils/database');
const { validateAndNormalizeAcademicRecord } = require('../utils/academicRecord');

const STUDENT_INSTITUTION_ID = '2021301236';
const STUDENT_NAME = 'Jose Reyes';
const SYNTHETIC_PROBATION_REASON = 'Due to failing grades (synthetic test data).';
const ACADEMIC_RECORD = {
  academicYear: '2026-2027',
  semester: '1st Semester',
  subjects: [
    { subjectCode: 'IT 111', subjectName: 'Introduction to Computing', units: 3, grade: 5.0, isMajor: true, status: 'Failed' },
    { subjectCode: 'IT 112', subjectName: 'Computer Programming 1', units: 3, grade: 4.0, isMajor: true, status: 'Failed' },
    { subjectCode: 'IT 113', subjectName: 'Discrete Mathematics', units: 3, grade: 5.0, isMajor: true, status: 'Failed' },
    { subjectCode: 'IT 114', subjectName: 'Information Technology Fundamentals', units: 3, grade: 3.5, isMajor: true, status: 'Failed' },
    { subjectCode: 'GE 101', subjectName: 'Understanding the Self', units: 3, grade: 4.0, isMajor: false, status: 'Failed' },
    { subjectCode: 'GE 102', subjectName: 'Readings in Philippine History', units: 3, grade: 3.5, isMajor: false, status: 'Failed' },
    { subjectCode: 'GE 103', subjectName: 'The Contemporary World', units: 3, grade: 5.0, isMajor: false, status: 'Failed' },
    { subjectCode: 'PE 1', subjectName: 'PATH FIT 1', units: 2, grade: 2.5, isMajor: false, status: 'Completed' }
  ]
};

const seedJoseReyesAcademicDemoRecord = async () => {
  const normalized = validateAndNormalizeAcademicRecord(ACADEMIC_RECORD);
  if (normalized.error) throw new Error(normalized.error);

  await connectCloudDatabase();
  try {
    const student = await Student.findOne({ institutionId: STUDENT_INSTITUTION_ID });
    if (!student) {
      throw new Error(`Student ${STUDENT_INSTITUTION_ID} was not found`);
    }

    const fullName = [
      student.personalInformation?.firstName,
      student.personalInformation?.lastName
    ].filter(Boolean).join(' ');
    if (fullName !== STUDENT_NAME) {
      throw new Error(`Student ID ${STUDENT_INSTITUTION_ID} belongs to ${fullName || 'an unnamed student'}, not ${STUDENT_NAME}`);
    }

    const recordFilter = {
      studentId: student._id,
      academicYear: normalized.value.academicYear,
      semester: normalized.value.semester
    };
    const existingRecord = await AcademicRecord.findOne(recordFilter).select('isDemo');
    if (existingRecord && !existingRecord.isDemo) {
      throw new Error('Refusing to overwrite a non-demo academic record');
    }

    await AcademicRecord.updateOne(
      recordFilter,
      {
        $set: { isDemo: true, subjects: normalized.value.subjects },
        $setOnInsert: {
          studentId: student._id,
          academicYear: normalized.value.academicYear,
          semester: normalized.value.semester
        }
      },
      { upsert: true, runValidators: true }
    );

    student.academicStatus.currentStatus = 'academic probation';
    student.academicStatus.isOnProbation = true;
    student.academicStatus.probationReason = SYNTHETIC_PROBATION_REASON;
    student.academicStatus.effectiveDate ||= new Date();
    await student.save();

    console.log(`Saved a clearly labeled synthetic academic record for ${STUDENT_NAME} (${STUDENT_INSTITUTION_ID}); it is not official.`);
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  seedJoseReyesAcademicDemoRecord().catch((error) => {
    console.error(`Unable to seed Jose Reyes synthetic academic data: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  ACADEMIC_RECORD,
  STUDENT_INSTITUTION_ID,
  STUDENT_NAME,
  SYNTHETIC_PROBATION_REASON,
  seedJoseReyesAcademicDemoRecord
};
