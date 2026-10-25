const mongoose = require('mongoose');
const { connectCloudDatabase } = require('../utils/database');
const Student = require('../models/Student');
const FacultyUser = require('../models/FacultyUser');
const FacultyEvaluation = require('../models/FacultyEvaluation');

async function seedEvaluation() {
  await connectCloudDatabase();
  console.log('Connected to database:', mongoose.connection.name);

  const student = await Student.findOne({
    $or: [{ username: '2401105814' }, { institutionId: '2401105814' }]
  });

  if (!student) {
    console.error('Student 2401105814 not found!');
    process.exit(1);
  }

  const faculty = await FacultyUser.findOne({ username: 'faculty.test' })
    || await FacultyUser.findOne({});

  if (!faculty) {
    console.error('Faculty user not found!');
    process.exit(1);
  }

  console.log(`Creating evaluation for Student: ${student.personalInformation?.firstName || student.username} ${student.personalInformation?.lastName || ''} (${student.institutionId || student.username})`);
  console.log(`Evaluator Faculty: ${faculty.firstName || faculty.username} ${faculty.lastName || ''} (${faculty.username})`);

  const evaluation = await FacultyEvaluation.findOneAndUpdate(
    { studentId: student._id },
    {
      studentId: student._id,
      facultyId: faculty._id,
      evaluationStatus: 'eligible',
      reasons: [
        'Prerequisites cleared for BSIT major courses',
        'Consistent Dean\'s Honor List academic standing',
        'Good moral standing and enrollment clearance complete'
      ],
      remarks: 'Student has satisfied all prerequisite curriculum requirements with commendable academic performance. Recommended for regular full-load enrollment for the upcoming semester.',
      evaluatedAt: new Date()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('✅ Faculty evaluation created successfully:');
  console.log({
    id: evaluation._id,
    studentId: evaluation.studentId,
    facultyId: evaluation.facultyId,
    status: evaluation.evaluationStatus,
    reasons: evaluation.reasons,
    remarks: evaluation.remarks,
    evaluatedAt: evaluation.evaluatedAt
  });

  await mongoose.disconnect();
}

seedEvaluation().catch((err) => {
  console.error('Error seeding evaluation:', err);
  process.exit(1);
});
