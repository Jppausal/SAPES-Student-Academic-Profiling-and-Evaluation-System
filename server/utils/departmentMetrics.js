const Department = require('../models/Department');
const Student = require('../models/Student');
const { DEPARTMENTS } = require('./departmentAccess');

const syncDepartmentMetrics = async (department) => {
  const [counts = {}] = await Student.aggregate([
    {
      $match: {
        accountStatus: 'active',
        'classification.program': department.program
      }
    },
    {
      $lookup: {
        from: 'faculty_evaluations',
        localField: '_id',
        foreignField: 'studentId',
        as: 'facultyEvaluations'
      }
    },
    {
      $group: {
        _id: null,
        totalStudents: { $sum: 1 },
        evaluatedProfiles: {
          $sum: {
            $cond: [{ $gt: [{ $size: '$facultyEvaluations' }, 0] }, 1, 0]
          }
        },
        pendingEnrollmentDecisions: {
          $sum: {
            $cond: [
              { $in: [{ $ifNull: ['$enrollmentStatus', 'not_enrolled'] }, ['not_enrolled', 'processing']] },
              1,
              0
            ]
          }
        },
        profilesAwaitingEvaluation: {
          $sum: {
            $cond: [{ $eq: [{ $size: '$facultyEvaluations' }, 0] }, 1, 0]
          }
        }
      }
    }
  ]);

  const stats = {
    totalStudents: counts.totalStudents || 0,
    profilesAwaitingEvaluation: counts.profilesAwaitingEvaluation || 0,
    pendingEnrollmentDecisions: counts.pendingEnrollmentDecisions || 0,
    evaluatedProfiles: counts.evaluatedProfiles || 0
  };
  if (Object.values(stats).some((count) => count < 0 || count > stats.totalStudents)) {
    throw new Error(`Department metrics are outside the student total for ${department.code}`);
  }

  return Department.findOneAndUpdate(
    { code: department.code },
    {
      $set: {
        name: department.name,
        program: department.program,
        ...stats,
        lastSyncedAt: new Date()
      }
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();
};

const syncAllDepartmentMetrics = () =>
  Promise.all(DEPARTMENTS.map((department) => syncDepartmentMetrics(department)));

module.exports = { syncAllDepartmentMetrics, syncDepartmentMetrics };
