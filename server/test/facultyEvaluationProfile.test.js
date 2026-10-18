const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const AcademicRecord = require('../models/AcademicRecord');
const AuditLog = require('../models/AuditLog');
const CourseEvaluation = require('../models/CourseEvaluation');
const FacultyEvaluation = require('../models/FacultyEvaluation');
const FacultyUser = require('../models/FacultyUser');
const RolePermission = require('../models/RolePermission');
const SessionToken = require('../models/SessionToken');
const Student = require('../models/Student');
const StudentStatusHistory = require('../models/StudentStatusHistory');
const facultyEvaluationRoutes = require('../routes/facultyEvaluationRoutes');

const queryResult = (value) => ({
  select() { return this; },
  sort() { return this; },
  lean: async () => value
});

test('faculty workspace returns the complete student profile including medical details', async (t) => {
  const originalMethods = {
    academicRecordFind: AcademicRecord.find,
    courseEvaluationFind: CourseEvaluation.find,
    courseEvaluationFindOne: CourseEvaluation.findOne,
    facultyEvaluationFindOne: FacultyEvaluation.findOne,
    facultyUserFindById: FacultyUser.findById,
    rolePermissionFindOne: RolePermission.findOne,
    sessionTokenFindOne: SessionToken.findOne,
    studentFind: Student.find,
    studentFindOne: Student.findOne,
    statusHistoryFind: StudentStatusHistory.find,
  };
  const originalJwtSecret = process.env.JWT_SECRET;
  const student = {
    _id: 'student-document-id',
    institutionId: '2021301234',
    username: 'juan.delacruz',
    personalInformation: {
      firstName: 'Juan',
      middleName: 'Paloma',
      lastName: 'Dela Cruz',
      suffix: 'Jr.',
      birthDate: new Date('2004-02-10'),
      birthPlace: 'Malaybalay',
      sex: 'Male',
      civilStatus: 'Single',
      nationality: 'Filipino',
      citizenship: 'Filipino',
      height: '170 cm',
      weight: '65 kg',
      bloodType: 'O+'
    },
    classification: {
      program: 'Bachelor of Information Technology',
      studentType: 'Regular',
      isIP: true,
      indigenousGroup: 'Higaonon',
      isPWD: false,
      isShifter: false,
      isTransferee: false
    },
    enrollmentInformation: {
      yearLevel: '2nd Year',
      curriculum: '2024 Curriculum',
      preferredModality: 'Face-to-face'
    },
    contactInformation: {
      mobileNumber: '09170000000',
      institutionalEmail: 'juan@student.buksu.edu.ph'
    },
    addresses: {
      presentAddress: { barangay: 'Poblacion', municipality: 'Malaybalay' }
    },
    educationalBackground: { seniorHigh: 'BukSU Senior High School' },
    religiousInformation: {
      religion: 'Catholic',
      shareSpiritualSchedule: true,
      spiritualActivities: [{ dayOfWeek: 'Sunday', startTime: '08:00', endTime: '10:00' }]
    },
    healthInformation: {
      hasRelevantHealthConcern: true,
      accommodationRequired: true,
      accommodationNotes: 'Seat near the front',
      conditions: ['Private diagnosis'],
      emergencyContactName: 'Private Contact',
      emergencyContactNumber: '09179999999'
    },
    academicStatus: { currentStatus: 'regular', isOnProbation: false },
    yearLevel: 2,
    section: 'IT-2A',
    enrollmentStatus: 'enrolled'
  };

  Student.findOne = () => queryResult(student);
  Student.find = () => queryResult([student]);
  AcademicRecord.find = () => queryResult([]);
  CourseEvaluation.findOne = () => queryResult(null);
  CourseEvaluation.find = () => queryResult([]);
  FacultyEvaluation.findOne = () => queryResult(null);
  StudentStatusHistory.find = () => queryResult([]);
  FacultyUser.findById = () => queryResult({
    username: 'faculty.user',
    role: 'faculty',
    accountStatus: 'active'
  });
  SessionToken.findOne = () => queryResult({ _id: 'session-token-id' });
  RolePermission.findOne = () => queryResult(null);
  process.env.JWT_SECRET = 'faculty-evaluation-profile-test-secret';

  t.after(() => {
    AcademicRecord.find = originalMethods.academicRecordFind;
    CourseEvaluation.find = originalMethods.courseEvaluationFind;
    CourseEvaluation.findOne = originalMethods.courseEvaluationFindOne;
    FacultyEvaluation.findOne = originalMethods.facultyEvaluationFindOne;
    FacultyUser.findById = originalMethods.facultyUserFindById;
    RolePermission.findOne = originalMethods.rolePermissionFindOne;
    SessionToken.findOne = originalMethods.sessionTokenFindOne;
    Student.find = originalMethods.studentFind;
    Student.findOne = originalMethods.studentFindOne;
    StudentStatusHistory.find = originalMethods.statusHistoryFind;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  });

  const app = express();
  app.use('/api/faculty-evaluations', facultyEvaluationRoutes);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  const token = jwt.sign({
    jti: 'faculty-session-id',
    userId: 'faculty-document-id',
    role: 'faculty',
    username: 'faculty.user'
  }, process.env.JWT_SECRET);
  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/faculty-evaluations/student/${student.institutionId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  const profile = payload.data.student;
  assert.equal(profile.personalInformation.middleName, 'Paloma');
  assert.equal(profile.personalInformation.birthDate, '2004-02-10T00:00:00.000Z');
  assert.equal(profile.enrollmentInformation.curriculum, '2024 Curriculum');
  assert.equal(profile.contactInformation.mobileNumber, '09170000000');
  assert.equal(profile.addresses.presentAddress.municipality, 'Malaybalay');
  assert.equal(profile.educationalBackground.seniorHigh, 'BukSU Senior High School');
  assert.equal(profile.religiousInformation.spiritualActivities.length, 1);
  assert.deepEqual(profile.healthInformation.conditions, ['Private diagnosis']);
  assert.equal(profile.healthInformation.hasRelevantHealthConcern, true);
  assert.equal(profile.healthInformation.emergencyContactName, 'Private Contact');
  assert.equal(profile.healthInformation.emergencyContactNumber, '09179999999');
  assert.equal(profile.healthInformation.accommodationNotes, 'Seat near the front');
});
