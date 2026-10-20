const mongoose = require('mongoose');

const Student = require('../models/Student');
const AcademicRecord = require('../models/AcademicRecord');
const { connectCloudDatabase } = require('../utils/database');

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
  await connectCloudDatabase();
  const duplicateAcademicTerms = await findDuplicateAcademicTerms();
  if (duplicateAcademicTerms.length > 0) {
    throw new Error('Cannot create the academic-term unique index: duplicate terms exist');
  }

  await Promise.all([
    Student.createIndexes(),
    require('../models/SystemSettings').createIndexes(),
    AcademicRecord.createIndexes()
  ]);

  console.log('Required SAPES indexes are present in sapes_dev.');
};

run()
  .catch((error) => {
    console.error('Index synchronization failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
