const express = require('express');
const Student = require('../models/Student');
const AcademicRecord = require('../models/AcademicRecord');
const CourseEvaluation = require('../models/CourseEvaluation');
const FacultyEvaluation = require('../models/FacultyEvaluation');
const StudentStatusHistory = require('../models/StudentStatusHistory');
const AuditLog = require('../models/AuditLog');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const authorizePermission = require('../middleware/permissionMiddleware').authorizePermission;
const { calculateMajorSubjectGwa, calculateOverallGwa, withAcademicGwas, getLatestAcademicPeriod } = require('../utils/academicCalculations');
const { calculateCourseMetrics, validateCourseEvaluation } = require('../utils/courseEvaluation');
const { getAcademicStatus } = require('../utils/academicStatus');
const { getAccountModelName } = require('../utils/accountCollections');
const {
  buildStudentDepartmentFilter,
  getEnrollmentOfficerDepartment
} = require('../utils/departmentAccess');
const { syncDepartmentMetrics } = require('../utils/departmentMetrics');

const router = express.Router();
const TECHNOLOGY_PROGRAMS = [
  'Bachelor of Information Technology',
  'Entertainment and Multimedia Computing',
  'Electronics',
  'Food Technology',
  'Automotive Technology'
];

const getPeerProgress = async (student) => {
  const peers = await Student.find({
    accountStatus: 'active',
    'classification.program': student.classification?.program,
    yearLevel: student.yearLevel,
    section: student.section
  }).select('_id').lean();
  const peerIds = peers.map((peer) => peer._id);
  const progressRecords = peerIds.length
    ? await CourseEvaluation.find({ studentId: { $in: peerIds } }).select('studentId assessments attendanceLogs').lean()
    : [];
  return { peerIds, progressRecords };
};

router.get(
  '/department-dashboard',
  authenticateToken,
  authorizeRoles('faculty'),
  authorizePermission('view_student_records'),
  async (req, res) => {
    try {
      const department = getEnrollmentOfficerDepartment(req.user);
      if (!req.user.isVerifiedEnrollmentOfficer || !department) {
        return res.status(403).json({ success: false, message: 'A verified department enrollment officer account is required' });
      }

      const departmentStudentFilter = {
        accountStatus: 'active',
        'classification.program': department.program
      };
      const [metrics, recentStudents, departmentStudentIds] = await Promise.all([
        syncDepartmentMetrics(department),
        Student.find(departmentStudentFilter, {
          institutionId: 1,
          personalInformation: 1,
          classification: 1,
          yearLevel: 1,
          enrollmentStatus: 1
        })
          .sort({ updatedAt: -1, _id: -1 })
          .limit(5)
          .lean(),
        Student.find(departmentStudentFilter).distinct('_id')
      ]);
      const recentEvaluations = departmentStudentIds.length
        ? await FacultyEvaluation.find({ studentId: { $in: departmentStudentIds } })
          .sort({ evaluatedAt: -1 })
          .limit(5)
          .lean()
        : [];
      const evaluatedStudentIds = recentEvaluations.map((evaluation) => evaluation.studentId);
      const evaluatedStudents = evaluatedStudentIds.length
        ? await Student.find({
          ...departmentStudentFilter,
          _id: { $in: evaluatedStudentIds }
        }, {
          institutionId: 1,
          personalInformation: 1
        }).lean()
        : [];
      const studentsById = new Map(evaluatedStudents.map((student) => [
        String(student._id),
        student
      ]));

      return res.json({
        success: true,
        data: {
          code: metrics.code,
          name: metrics.name,
          program: metrics.program,
          totalStudents: metrics.totalStudents,
          profilesAwaitingEvaluation: metrics.profilesAwaitingEvaluation,
          pendingEnrollmentDecisions: metrics.pendingEnrollmentDecisions,
          evaluatedProfiles: metrics.evaluatedProfiles,
          lastSyncedAt: metrics.lastSyncedAt,
          recentStudents: recentStudents.map((student) => ({
            institutionId: student.institutionId,
            name: [student.personalInformation?.firstName, student.personalInformation?.lastName]
              .filter(Boolean)
              .join(' ') || student.institutionId,
            program: student.classification?.program || department.program,
            yearLevel: student.yearLevel || null,
            enrollmentStatus: student.enrollmentStatus || 'not_enrolled'
          })),
          recentEvaluations: recentEvaluations.flatMap((evaluation) => {
            const student = studentsById.get(String(evaluation.studentId));
            if (!student) return [];
            return [{
              institutionId: student.institutionId,
              name: [student.personalInformation?.firstName, student.personalInformation?.lastName]
                .filter(Boolean)
                .join(' ') || student.institutionId,
              evaluationStatus: evaluation.evaluationStatus,
              evaluatedAt: evaluation.evaluatedAt
            }];
          })
        }
      });
    } catch (error) {
      console.error('Error loading department enrollment dashboard:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

router.post(
  '/student/:institutionId/enrollment-approval',
  authenticateToken,
  authorizeRoles('faculty'),
  authorizePermission('view_student_records'),
  async (req, res) => {
    try {
      const department = getEnrollmentOfficerDepartment(req.user);
      if (!req.user.isVerifiedEnrollmentOfficer || !department) {
        return res.status(403).json({ success: false, message: 'A verified department enrollment officer account is required' });
      }

      const studentFilter = buildStudentDepartmentFilter(req.user, {
        institutionId: req.params.institutionId,
        accountStatus: 'active'
      });
      if (!studentFilter) {
        return res.status(403).json({ success: false, message: 'No valid department is assigned to this enrollment officer' });
      }

      const student = await Student.findOneAndUpdate(
        studentFilter,
        { $set: { enrollmentStatus: 'enrolled' } },
        { new: true, runValidators: true }
      ).select('institutionId enrollmentStatus classification.program').lean();
      if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

      await syncDepartmentMetrics(department);
      await AuditLog.create({
        userId: req.user.userId,
        userRole: req.user.role,
        userModel: getAccountModelName(req.user.role),
        action: 'STUDENT_ENROLLMENT_APPROVED',
        targetType: 'student',
        targetId: student._id,
        details: {
          institutionId: student.institutionId,
          enrollmentStatus: student.enrollmentStatus
        }
      });

      return res.json({
        success: true,
        data: {
          institutionId: student.institutionId,
          enrollmentStatus: student.enrollmentStatus
        }
      });
    } catch (error) {
      console.error('Student enrollment approval failed:', error);
      return res.status(500).json({ success: false, message: 'Unable to approve student enrollment' });
    }
  }
);

router.get(
  '/roster',
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  authorizePermission('view_student_records'),
  async (req, res) => {
    try {
      const department = getEnrollmentOfficerDepartment(req.user);
      if (req.user.isVerifiedEnrollmentOfficer && !department) {
        return res.status(403).json({ success: false, message: 'No valid department is assigned to this enrollment officer' });
      }
      const program = department?.program || req.query.program;
      const { section } = req.query;
      const yearLevel = req.query.yearLevel === undefined ? undefined : Number(req.query.yearLevel);
      if (!TECHNOLOGY_PROGRAMS.includes(program)) {
        return res.status(400).json({ success: false, message: 'A valid College of Technologies program is required' });
      }
      if (department && req.query.program && req.query.program !== department.program) {
        return res.status(403).json({ success: false, message: 'Enrollment officers may only view their assigned department' });
      }
      if (yearLevel !== undefined && (!Number.isInteger(yearLevel) || yearLevel < 1 || yearLevel > 6)) {
        return res.status(400).json({ success: false, message: 'yearLevel must be an integer from 1 to 6' });
      }

      const filter = { accountStatus: 'active', 'classification.program': program };
      if (yearLevel !== undefined) filter.yearLevel = yearLevel;
      if (typeof section === 'string' && section.trim()) filter.section = section.trim();

      const scopedFilter = buildStudentDepartmentFilter(req.user, filter);
      if (!scopedFilter) {
        return res.status(403).json({ success: false, message: 'No valid department is assigned to this enrollment officer' });
      }

      const students = await Student.find(scopedFilter, {
        institutionId: 1,
        username: 1,
        personalInformation: 1,
        classification: 1,
        academicStatus: 1,
        yearLevel: 1,
        section: 1,
        enrollmentStatus: 1
      }).sort({ yearLevel: 1, section: 1, institutionId: 1 }).lean();
      const studentIds = students.map((student) => student._id);
      const progressRecords = studentIds.length
        ? await CourseEvaluation.find({ studentId: { $in: studentIds } }).select('studentId assessments attendanceLogs rubricScores').lean()
        : [];
      const progressByStudent = new Map(progressRecords.map((record) => [String(record.studentId), record]));
      const runningGradesByCohort = new Map();
      for (const student of students) {
        const progress = progressByStudent.get(String(student._id)) || {};
        const cohort = `${student.yearLevel || 'unknown'}|${student.section || 'Unassigned'}`;
        const grades = runningGradesByCohort.get(cohort) || [];
        const runningGrade = calculateCourseMetrics(progress).runningGrade;
        if (runningGrade !== null) grades.push(runningGrade);
        runningGradesByCohort.set(cohort, grades);
      }

      return res.json({
        success: true,
        data: {
          students: students.map((student) => {
            const progress = progressByStudent.get(String(student._id)) || {};
            const cohort = `${student.yearLevel || 'unknown'}|${student.section || 'Unassigned'}`;
            const metrics = calculateCourseMetrics(
              progress,
              runningGradesByCohort.get(cohort) || []
            );
            return {
              institutionId: student.institutionId,
              username: student.username || '',
              firstName: student.personalInformation?.firstName || '',
              lastName: student.personalInformation?.lastName || '',
              program: student.classification?.program || '',
              yearLevel: student.yearLevel || null,
              section: student.section || 'Unassigned',
              enrollmentStatus: student.enrollmentStatus || 'not_enrolled',
              ...getAcademicStatus(student),
              metrics
            };
          })
        }
      });
    } catch (error) {
      console.error('Error loading faculty evaluation roster:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

router.get(
  '/student/:institutionId',
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  authorizePermission('view_student_records'),
  async (req, res) => {
    try {
      const studentFilter = buildStudentDepartmentFilter(req.user, {
        institutionId: req.params.institutionId,
        accountStatus: 'active'
      });
      if (!studentFilter) {
        return res.status(403).json({ success: false, message: 'No valid department is assigned to this enrollment officer' });
      }
      const student = await Student.findOne(studentFilter).lean();
      if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

      const [academicRecords, progress, facultyEvaluation, statusHistory] = await Promise.all([
        AcademicRecord.find({ studentId: student._id })
          .select('-_id academicYear semester subjects isDemo')
          .sort({ academicYear: -1, semester: -1 })
          .lean(),
        CourseEvaluation.findOne({ studentId: student._id }).lean(),
        FacultyEvaluation.findOne({ studentId: student._id })
          .sort({ evaluatedAt: -1 })
          .select('-_id evaluationStatus reasons remarks evaluatedAt')
          .lean(),
        StudentStatusHistory.find({ studentId: student._id })
          .select('-_id status reason effectiveDate remarks')
          .sort({ effectiveDate: -1 })
          .lean()
      ]);
      const { peerIds, progressRecords } = await getPeerProgress(student);
      const peerGrades = progressRecords.map((record) => calculateCourseMetrics(record).runningGrade);
      const metrics = calculateCourseMetrics(progress || {}, peerGrades);

      return res.json({
        success: true,
        data: {
          student: {
            institutionId: student.institutionId,
            username: student.username || '',
            personalInformation: {
              firstName: student.personalInformation?.firstName || '',
              middleName: student.personalInformation?.middleName || '',
              lastName: student.personalInformation?.lastName || '',
              suffix: student.personalInformation?.suffix || '',
              birthDate: student.personalInformation?.birthDate || null,
              birthPlace: student.personalInformation?.birthPlace || '',
              sex: student.personalInformation?.sex || '',
              civilStatus: student.personalInformation?.civilStatus || '',
              height: student.personalInformation?.height || '',
              weight: student.personalInformation?.weight || '',
              bloodType: student.personalInformation?.bloodType || '',
              nationality: student.personalInformation?.nationality || '',
              citizenship: student.personalInformation?.citizenship || '',
              dualCitizenship: student.personalInformation?.dualCitizenship || '',
              minority: student.personalInformation?.minority || '',
              isForeigner: Boolean(student.personalInformation?.isForeigner)
            },
            classification: {
              program: student.classification?.program || '',
              studentType: student.classification?.studentType || '',
              isIP: Boolean(student.classification?.isIP),
              indigenousGroup: student.classification?.indigenousGroup || '',
              isPWD: Boolean(student.classification?.isPWD),
              isShifter: Boolean(student.classification?.isShifter),
              isTransferee: Boolean(student.classification?.isTransferee)
            },
            enrollmentInformation: {
              course: student.enrollmentInformation?.course || '',
              level: student.enrollmentInformation?.level || '',
              department: student.enrollmentInformation?.department || '',
              curriculum: student.enrollmentInformation?.curriculum || '',
              yearLevel: student.enrollmentInformation?.yearLevel || '',
              entryPeriod: student.enrollmentInformation?.entryPeriod || '',
              entryDate: student.enrollmentInformation?.entryDate || null,
              studentType: student.enrollmentInformation?.studentType || '',
              preferredModality: student.enrollmentInformation?.preferredModality || '',
              campus: student.enrollmentInformation?.campus || '',
              learnerReferenceNo: student.enrollmentInformation?.learnerReferenceNo || '',
              nstpNumber: student.enrollmentInformation?.nstpNumber || ''
            },
            contactInformation: {
              mobileNumber: student.contactInformation?.mobileNumber || '',
              alternateMobileNumber: student.contactInformation?.alternateMobileNumber || '',
              telephoneNumber: student.contactInformation?.telephoneNumber || '',
              institutionalEmail: student.contactInformation?.institutionalEmail || '',
              alternateEmail: student.contactInformation?.alternateEmail || ''
            },
            addresses: {
              presentAddress: student.addresses?.presentAddress || {},
              homeAddress: student.addresses?.homeAddress || {}
            },
            educationalBackground: {
              previousSchool: student.educationalBackground?.previousSchool || '',
              seniorHigh: student.educationalBackground?.seniorHigh || '',
              juniorHigh: student.educationalBackground?.juniorHigh || '',
              elementary: student.educationalBackground?.elementary || ''
            },
            religiousInformation: {
              religion: student.religiousInformation?.religion || '',
              shareSpiritualSchedule: Boolean(student.religiousInformation?.shareSpiritualSchedule),
              spiritualActivities: student.religiousInformation?.shareSpiritualSchedule
                ? student.religiousInformation.spiritualActivities || []
                : []
            },
            healthInformation: {
              hasRelevantHealthConcern: Boolean(student.healthInformation?.hasRelevantHealthConcern),
              conditions: student.healthInformation?.conditions || [],
              otherCondition: student.healthInformation?.otherCondition || '',
              allergyDetails: student.healthInformation?.allergyDetails || '',
              conditionDescription: student.healthInformation?.conditionDescription || '',
              accommodationRequired: Boolean(student.healthInformation?.accommodationRequired),
              accommodationNotes: student.healthInformation?.accommodationNotes || '',
              emergencyContactName: student.healthInformation?.emergencyContactName || '',
              emergencyContactNumber: student.healthInformation?.emergencyContactNumber || '',
              lastUpdated: student.healthInformation?.lastUpdated || null
            },
            academicStatus: getAcademicStatus(student),
            yearLevel: student.yearLevel || student.enrollmentInformation?.yearLevel || null,
            section: student.section || 'Unassigned',
            enrollmentStatus: student.enrollmentStatus || 'not_enrolled'
          },
          academicRecords: withAcademicGwas(academicRecords),
          overallGwa: calculateOverallGwa(academicRecords),
          majorSubjectGwa: calculateMajorSubjectGwa(academicRecords),
          latestAcademicPeriod: getLatestAcademicPeriod(academicRecords),
          facultyEvaluation: facultyEvaluation ? {
            evaluationStatus: facultyEvaluation.evaluationStatus,
            reasons: facultyEvaluation.reasons || [],
            remarks: facultyEvaluation.remarks || '',
            evaluatedAt: facultyEvaluation.evaluatedAt
          } : null,
          courseEvaluation: progress || {
            academicYear: '2026-2027',
            semester: '1st Semester',
            assessments: [],
            attendanceLogs: [],
            rubricScores: [],
            facultyRemarks: [],
            internalNotes: ''
          },
          metrics,
          peerCount: peerIds.length
        }
      });
    } catch (error) {
      console.error('Error loading faculty student workspace:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

router.put(
  '/student/:institutionId/progress',
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  authorizePermission('submit_evaluations'),
  async (req, res) => {
    try {
      const studentFilter = buildStudentDepartmentFilter(req.user, {
        institutionId: req.params.institutionId,
        accountStatus: 'active'
      });
      if (!studentFilter) {
        return res.status(403).json({ success: false, message: 'No valid department is assigned to this enrollment officer' });
      }
      const student = await Student.findOne(studentFilter).select('_id institutionId').lean();
      if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

      const normalized = validateCourseEvaluation(req.body);
      if (normalized.error) return res.status(400).json({ success: false, message: normalized.error });

      const progress = await CourseEvaluation.findOneAndUpdate(
        { studentId: student._id },
        { $set: normalized.value },
        { returnDocument: 'after', runValidators: true, upsert: true, setDefaultsOnInsert: true }
      ).lean();

      await AuditLog.create({
        userId: req.user.userId,
        userRole: req.user.role,
        userModel: getAccountModelName(req.user.role),
        action: 'COURSE_EVALUATION_UPDATED',
        targetType: 'course_evaluation',
        targetId: progress._id,
        details: { institutionId: student.institutionId }
      });

      return res.json({ success: true, data: { courseEvaluation: progress } });
    } catch (error) {
      console.error('Error saving faculty course evaluation:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
