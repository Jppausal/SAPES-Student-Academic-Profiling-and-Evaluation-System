const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const AdminUser = require('../models/AdminUser');
const FacultyUser = require('../models/FacultyUser');
const Student = require('../models/Student');
const AcademicRecord = require('../models/AcademicRecord');
const FacultyEvaluation = require('../models/FacultyEvaluation');
const StudentStatusHistory = require('../models/StudentStatusHistory');
const AuditLog = require('../models/AuditLog');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connected for seeding.');

    // --------------------------------------------------
    // 1. Create test users
    // --------------------------------------------------

    const passwordHash = await bcrypt.hash('Test1234!', 10);

const admin = await AdminUser.findOneAndUpdate(
  { username: 'admin.test' },
  {
    username: 'admin.test',
    email: 'admin.test@buksu.edu.ph',
    passwordHash,
    role: 'admin',
    accountStatus: 'active'
  },
  {
    returnDocument: 'after',
    upsert: true,
    setDefaultsOnInsert: true
  }
);

    const faculty = await FacultyUser.findOneAndUpdate(
      { username: 'faculty.test' },
      {
        username: 'faculty.test',
        email: 'faculty.test@faculty.buksu.edu.ph',
        firstName: 'Kurt',
        lastName: 'Santos',
        employeeId: 'TEST-FACULTY-0001',
        passwordHash,
        role: 'faculty',
        accountStatus: 'active'
      },
 {
  returnDocument: 'after',
  upsert: true,
  setDefaultsOnInsert: true
}
    );

    // --------------------------------------------------
    // 2. Create test student account and profile
    // --------------------------------------------------

    const student = await Student.findOneAndUpdate(
      { institutionId: 'TEST-0001' },
      {
        institutionId: 'TEST-0001',
        username: 'student.test',
        email: 'student.test@student.buksu.edu.ph',
        passwordHash,
        role: 'student',
        accountStatus: 'active',

        personalInformation: {
          firstName: 'Juan',
          middleName: 'Test',
          lastName: 'Student',
          sex: 'Male',
          civilStatus: 'Single',
          nationality: 'Filipino',
          citizenship: 'Filipino',
          isForeigner: false
        },

        classification: {
          studentType: 'regular',
          isIP: false,
          isPWD: false
        },

        religiousInformation: {
          religion: 'Catholic'
        },

        academicStatus: {
          currentStatus: 'regular',
          isOnProbation: false
        }
      },
{
  returnDocument: 'after',
  upsert: true,
  setDefaultsOnInsert: true
}
    );

    // --------------------------------------------------
    // 3. Create academic record
    // --------------------------------------------------

    let academicRecord = await AcademicRecord.findOne({
      studentId: student._id,
      academicYear: '2026-2027',
      semester: '1st'
    });

    if (!academicRecord) {
      academicRecord = await AcademicRecord.create({
        studentId: student._id,

        academicYear: '2026-2027',

        semester: '1st',

        subjects: [
          {
            subjectCode: 'IT301',
            subjectName: 'Database Management Systems',
            units: 3,
            grade: 1.25,
            isMajor: true,
            status: 'Completed'
          },

          {
            subjectCode: 'IT302',
            subjectName: 'Systems Analysis and Design',
            units: 3,
            grade: 1.50,
            isMajor: true,
            status: 'Completed'
          },

          {
            subjectCode: 'GEN101',
            subjectName: 'Contemporary World',
            units: 3,
            grade: 1.00,
            isMajor: false,
            status: 'Completed'
          }
        ]
      });
    }

    // --------------------------------------------------
    // 4. Create faculty evaluation
    // --------------------------------------------------

    await FacultyEvaluation.findOneAndUpdate(
      {
        studentId: student._id,
        facultyId: faculty._id
      },
      {
        studentId: student._id,
        facultyId: faculty._id,
        evaluationStatus: 'for_review',
        reasons: [
          'Student academic record requires faculty review.'
        ],
        remarks: 'Development test evaluation.'
      },
{
  returnDocument: 'after',
  upsert: true,
  setDefaultsOnInsert: true
}
    );

    // --------------------------------------------------
    // 5. Create status history
    // --------------------------------------------------

    const existingStatus = await StudentStatusHistory.findOne({
      studentId: student._id,
      status: 'regular'
    });

    if (!existingStatus) {
      await StudentStatusHistory.create({
        studentId: student._id,
        status: 'regular',
        reason: 'Initial development test status.',
        effectiveDate: new Date(),
        recordedBy: admin._id,
        recordedByModel: 'AdminUser',
        remarks: 'Development test record.'
      });
    }

    // --------------------------------------------------
    // 6. Create audit log
    // --------------------------------------------------

    await AuditLog.create({
      userId: admin._id,
      userRole: 'admin',
      userModel: 'AdminUser',
      action: 'SEED_TEST_DATA',
      targetType: 'system',
      targetId: null,
      details: {
        message: 'Initial SAPES development test data created.'
      }
    });

    console.log('✅ SAPES test data created successfully.');

    console.log('');
    console.log('Test accounts:');
    console.log('Admin   : admin.test');
    console.log('Faculty : faculty.test');
    console.log('Student : student.test');
    console.log('Password: Test1234!');
    console.log('');
    console.log('Test student institution ID: TEST-0001');

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Seeding failed:', error);

    await mongoose.connection.close();

    process.exit(1);
  }
};

seedDatabase();