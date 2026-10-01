const mongoose = require('mongoose');
require('dotenv').config({ quiet: true });

const Student = require('../models/Student');
const AcademicRecord = require('../models/AcademicRecord');

const findDuplicateStudentUsers = () => Student.aggregate([
  { $group: { _id: '$userId', count: { $sum: 1 } } },
  { $match: { _id: { $ne: null }, count: { $gt: 1 } } },
  { $limit: 10 }
]);

const findDuplicateAcademicTerms = () => AcademicRecord.aggregate([
  {
    $group: {
      _id: {
        studentId: '$studentId',
        academicYear: '$academicYear',
        semester: '$semester'
      },
      count: { $sum: 1 }
    }
  },
  { $match: { count: { $gt: 1 } } },
  { $limit: 10 }
]);

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');

  await mongoose.connect(process.env.MONGO_URI);
  const [duplicateStudentUsers, duplicateAcademicTerms] = await Promise.all([
    findDuplicateStudentUsers(),
    findDuplicateAcademicTerms()
  ]);

  if (duplicateStudentUsers.length > 0) {
    throw new Error('Cannot create the Student.userId unique index: duplicate linked users exist');
  }
  if (duplicateAcademicTerms.length > 0) {
    throw new Error('Cannot create the academic-term unique index: duplicate terms exist');
  }

  await Promise.all([
    Student.createIndexes(),
    AcademicRecord.createIndexes()
  ]);

  console.log('Required SAPES indexes are present.');
};

run()
  .catch((error) => {
    console.error('Index synchronization failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
