const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Student = require('../models/Student');
const AcademicRecord = require('../models/AcademicRecord');
const { validateAndNormalizeAcademicRecord } = require('../utils/academicRecord');

const TEST_PASSWORD = 'Test1234!';

const BSIT_TEST_STUDENTS = [
  { username: 'bsit.test01', institutionId: 'TEST-BSIT-0001', firstName: 'Alex', lastName: 'Rivera' },
  { username: 'bsit.test02', institutionId: 'TEST-BSIT-0002', firstName: 'Bianca', lastName: 'Santos' },
  { username: 'bsit.test03', institutionId: 'TEST-BSIT-0003', firstName: 'Carlo', lastName: 'Mendoza' },
  { username: 'bsit.test04', institutionId: 'TEST-BSIT-0004', firstName: 'Dana', lastName: 'Flores' },
  { username: 'bsit.test05', institutionId: 'TEST-BSIT-0005', firstName: 'Ethan', lastName: 'Garcia' }
];

const BSIT_CURRICULUM_TERMS = [
  {
    academicYear: '2024-2025',
    semester: '1st Semester',
    subjects: [
      ['GE 108', 'Understanding the Self', 3, 1.00, false],
      ['IS 101', 'Bukidnon Cultural Studies', 3, 1.50, false],
      ['IS 104', 'Advanced Grammar in English', 3, 1.50, false],
      ['IT 111A', 'Introduction to Computing', 3, 1.25, true],
      ['IT 112A', 'Computer Programming 1', 3, 1.25, true],
      ['IT 113A', 'IT Fundamentals', 3, 1.25, true],
      ['PE 1A', 'PATH FIT 1 - Movement Enhancement', 2, 1.25, false],
      ['NSTP 1B', 'Civic Welfare Training Service 1', 3, 1.25, false]
    ]
  },
  {
    academicYear: '2024-2025',
    semester: '2nd Semester',
    subjects: [
      ['GE 104A', 'Readings in Philippine History', 3, 1.00, false],
      ['GE EL 108', 'Philippine Indigenous Communities', 3, 1.50, false],
      ['IT 114A', 'Computer Programming 2', 3, 1.50, true],
      ['IT 115A', 'Introduction to Human Computer Interaction', 3, 1.75, true],
      ['PE 2A', 'PATH FIT 2 - Fitness Exercises', 2, 1.25, false],
      ['GE 105', 'Mathematics in the Modern World', 3, 1.25, false],
      ['NSTP 2B', 'Civic Welfare Training Service 2', 3, 1.25, false]
    ]
  },
  {
    academicYear: '2025-2026',
    semester: '1st Semester',
    subjects: [
      ['GE 103', 'The Contemporary World', 3, 1.00, false],
      ['IS 105', 'Technical Writing', 3, 1.50, false],
      ['IT 121', 'Data Structures and Algorithms', 3, 1.25, true],
      ['IT 122', 'Elective 1 - Platform Technologies', 3, 1.25, true],
      ['IT 123', 'Elective 2 - Object-Oriented Programming', 3, 1.50, true],
      ['IT 124', 'Principles of Logic Design', 3, 1.25, true],
      ['IT 125A', 'Applied Calculus in IT', 3, 1.00, true],
      ['PE 3A', 'PATH FIT 3 - Regional, National and International Games', 2, 1.00, false]
    ]
  },
  {
    academicYear: '2025-2026',
    semester: '2nd Semester',
    subjects: [
      ['GE EL 107', 'The Entrepreneurial Mind', 3, 1.25, false],
      ['GE 101', 'Art Appreciation', 3, 1.25, false],
      ['IT 116', 'Discrete Mathematics', 3, 1.00, true],
      ['GE 102', 'Ethics', 3, 1.25, false],
      ['IT 126A', 'Information Management', 3, 1.50, true],
      ['IT 127A', 'Quantitative Methods', 3, 1.25, true],
      ['IT 128A', 'Networking 1', 3, 1.50, true],
      ['IT 129A', 'Integrative Programming and Technologies', 3, 1.25, true],
      ['PE 4A', 'PATH FIT 4 - Games, Sports and Outdoor Activities', 2, 1.25, false]
    ]
  }
];

const gradeAdjustments = [
  [0],
  [0.25, 0, 0.25, -0.25],
  [0.50, 0.25, 0, -0.25],
  [0, 0.50, 0.25, 0],
  [0.25, -0.25, 0.50, 0.25]
];

const buildRecordsForStudent = (studentIndex) => BSIT_CURRICULUM_TERMS.map((term) => ({
  academicYear: term.academicYear,
  semester: term.semester,
  subjects: term.subjects.map(([subjectCode, subjectName, units, baseGrade, isMajor], subjectIndex) => {
    const pattern = gradeAdjustments[studentIndex];
    const grade = Math.min(3, Math.max(1, baseGrade + pattern[subjectIndex % pattern.length]));
    return { subjectCode, subjectName, units, grade, isMajor, status: 'Completed' };
  })
}));

const seedBsitCurriculumStudents = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI);

  try {
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
    const results = [];

    for (const [studentIndex, fixture] of BSIT_TEST_STUDENTS.entries()) {
      let user = await User.findOne({ username: fixture.username });
      let userCreated = false;
      if (!user) {
        user = await User.create({
          username: fixture.username,
          passwordHash,
          role: 'student',
          accountStatus: 'active',
          firstName: fixture.firstName,
          lastName: fixture.lastName,
          email: `${fixture.username}@example.test`,
          studentNumber: fixture.institutionId
        });
        userCreated = true;
      }
      if (user.role !== 'student') throw new Error(`${fixture.username} exists with a non-student role`);

      let student = await Student.findOne({ userId: user._id });
      try {
        if (!student) {
          student = await Student.create({
            userId: user._id,
            institutionId: fixture.institutionId,
            personalInformation: {
              firstName: fixture.firstName,
              lastName: fixture.lastName,
              nationality: 'Filipino',
              citizenship: 'Filipino',
              civilStatus: 'Single'
            },
            classification: { studentType: 'regular' },
            religiousInformation: { religion: 'Not specified' },
            academicStatus: { currentStatus: 'regular', isOnProbation: false }
          });
        }
      } catch (error) {
        if (userCreated) await User.deleteOne({ _id: user._id });
        throw error;
      }
      if (student.institutionId !== fixture.institutionId) {
        throw new Error(`${fixture.username} is linked to unexpected institution ID ${student.institutionId}`);
      }

      const terms = [];
      for (const candidate of buildRecordsForStudent(studentIndex)) {
        const normalized = validateAndNormalizeAcademicRecord(candidate);
        if (normalized.error) throw new Error(`${fixture.username}: ${normalized.error}`);
        const result = await AcademicRecord.updateOne(
          { studentId: student._id, academicYear: normalized.value.academicYear, semester: normalized.value.semester },
          { $setOnInsert: { studentId: student._id, ...normalized.value } },
          { upsert: true }
        );
        terms.push({
          academicYear: normalized.value.academicYear,
          semester: normalized.value.semester,
          subjectCount: normalized.value.subjects.length,
          outcome: result.upsertedCount === 1 ? 'created' : 'already existed'
        });
      }
      results.push({ username: fixture.username, institutionId: fixture.institutionId, terms });
    }

    console.log(JSON.stringify({ curriculum: '2024-2025 Bachelor of Science in Information Technology', students: results }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  seedBsitCurriculumStudents().catch((error) => {
    console.error(`Unable to seed BSIT curriculum students: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  BSIT_TEST_STUDENTS,
  BSIT_CURRICULUM_TERMS,
  buildRecordsForStudent,
  seedBsitCurriculumStudents
};
