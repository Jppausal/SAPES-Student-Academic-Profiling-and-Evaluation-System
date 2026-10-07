const express = require('express');
const Student = require('../models/Student');
const AcademicRecord = require('../models/AcademicRecord');
const CourseEvaluation = require('../models/CourseEvaluation');
const AuditLog = require('../models/AuditLog');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const authorizePermission = require('../middleware/permissionMiddleware').authorizePermission;
const { calculateMajorSubjectGwa, calculateOverallGwa, withAcademicGwas, getLatestAcademicPeriod } = require('../utils/academicCalculations');
const { calculateCourseMetrics, validateCourseEvaluation } = require('../utils/courseEvaluation');

const router = express.Router();
const TECHNOLOGY_PROGRAMS = [
  'Bachelor of Information Technology',
  'Entertainment and Multimedia Computing',
  'Electronics',
  'Food Technology',
  'Automotive Technology'
];

const getAcademicStatus = (student) => {
  const currentStatus = student.academicStatus?.currentStatus || 'Not recorded';
  const isOnProbation = Boolean(
    student.academicStatus?.isOnProbation || /probation/i.test(currentStatus)
  );
  return { currentStatus, isOnProbation };
};

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
  '/roster',
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  authorizePermission('view_student_records'),
  async (req, res) => {
    try {
      const { program, section } = req.query;
      const yearLevel = req.query.yearLevel === undefined ? undefined : Number(req.query.yearLevel);
      if (!TECHNOLOGY_PROGRAMS.includes(program)) {
        return res.status(400).json({ success: false, message: 'A valid College of Technologies program is required' });
      }
      if (yearLevel !== undefined && (!Number.isInteger(yearLevel) || yearLevel < 1 || yearLevel > 6)) {
        return res.status(400).json({ success: false, message: 'yearLevel must be an integer from 1 to 6' });
      }

      const filter = { accountStatus: 'active', 'classification.program': program };
      if (yearLevel !== undefined) filter.yearLevel = yearLevel;
      if (typeof section === 'string' && section.trim()) filter.section = section.trim();

      const students = await Student.find(filter, {
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
      const student = await Student.findOne({
        institutionId: req.params.institutionId,
        accountStatus: 'active'
      }).lean();
      if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

      const [academicRecords, progress] = await Promise.all([
        AcademicRecord.find({ studentId: student._id })
          .select('-_id academicYear semester subjects')
          .sort({ academicYear: -1, semester: -1 })
          .lean(),
        CourseEvaluation.findOne({ studentId: student._id }).lean()
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
            personalInformation: student.personalInformation || {},
            classification: student.classification || {},
            academicStatus: getAcademicStatus(student),
            yearLevel: student.yearLevel || null,
            section: student.section || 'Unassigned',
            enrollmentStatus: student.enrollmentStatus || 'not_enrolled'
          },
          academicRecords: withAcademicGwas(academicRecords),
          overallGwa: calculateOverallGwa(academicRecords),
          majorSubjectGwa: calculateMajorSubjectGwa(academicRecords),
          latestAcademicPeriod: getLatestAcademicPeriod(academicRecords),
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
      const student = await Student.findOne({
        institutionId: req.params.institutionId,
        accountStatus: 'active'
      }).select('_id institutionId').lean();
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
