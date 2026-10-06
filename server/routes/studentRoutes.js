const express = require('express');
const Student = require('../models/Student');
const AcademicRecord = require('../models/AcademicRecord');
const FacultyEvaluation = require('../models/FacultyEvaluation');
const StudentStatusHistory = require('../models/StudentStatusHistory');
const AuditLog = require('../models/AuditLog');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { authorizePermission, authorizeAnyPermission } = require('../middleware/permissionMiddleware');
const { validateAndNormalizeStudentProfile } = require('../utils/studentProfile');
const { validateAndNormalizeAcademicRecord } = require('../utils/academicRecord');
const { calculateMajorSubjectGwa } = require('../utils/academicCalculations');
const { DAYS, isTime, findScheduleConflicts } = require('../utils/scheduleConflicts');

const router = express.Router();
const TECHNOLOGY_PROGRAMS = [
  'Bachelor of Information Technology',
  'Entertainment and Multimedia Computing',
  'Electronics',
  'Food Technology',
  'Automotive Technology'
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.put('/:institutionId/classification', authenticateToken, authorizeRoles('faculty', 'admin'), authorizeAnyPermission('submit_evaluations', 'manage_academic_records'), async (req, res) => {
  try {
    const profileUpdate = validateAndNormalizeStudentProfile({ classification: req.body?.classification }, { allowClassification: true });
    if (profileUpdate.error) return res.status(400).json({ success: false, message: profileUpdate.error });
    const student = await Student.findOne({ institutionId: req.params.institutionId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    Object.assign(student.classification, profileUpdate.value.classification);
    await student.save();
    await AuditLog.create({ userId: req.user.userId, action: 'UPDATE_STUDENT_CLASSIFICATION', targetType: 'student', targetId: student._id, details: { institutionId: student.institutionId } });
    return res.json({ success: true, data: student.classification });
  } catch (error) { console.error('Classification update failed:', error); return res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/:institutionId/schedule-conflicts', authenticateToken, authorizeRoles('faculty', 'admin'), authorizeAnyPermission('submit_evaluations', 'manage_academic_records'), async (req, res) => {
  try {
    const meetings = req.body?.meetings;
    if (!Array.isArray(meetings) || meetings.length < 1 || meetings.some((meeting) => !meeting || !DAYS.includes(meeting.dayOfWeek) || !isTime(meeting.startTime) || !isTime(meeting.endTime) || meeting.startTime >= meeting.endTime)) return res.status(400).json({ success: false, message: 'Provide valid meeting day and time ranges.' });
    const student = await Student.findOne({ institutionId: req.params.institutionId }, { religiousInformation: 1 }).lean();
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    const activities = student.religiousInformation?.shareSpiritualSchedule ? student.religiousInformation.spiritualActivities || [] : [];
    const conflicts = findScheduleConflicts(activities, meetings);
    return res.json({ success: true, data: { eligible: conflicts.length === 0, conflicts } });
  } catch (error) { console.error('Schedule conflict check failed:', error); return res.status(500).json({ success: false, message: 'Server error' }); }
});

// Record an authorized student status update and preserve its history
router.put(
  '/:institutionId/status',
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  authorizeAnyPermission('submit_evaluations', 'manage_academic_records'),
  async (req, res) => {
    try {
      const { institutionId } = req.params;
      const body = req.body || {};
      const allowedFields = ['status', 'reason', 'effectiveDate', 'remarks'];
      const unsupportedFields = Object.keys(body).filter(
        (field) => !allowedFields.includes(field)
      );

      if (unsupportedFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported status update fields'
        });
      }

      const { status, reason, effectiveDate, remarks } = body;

      if (typeof status !== 'string' || !status.trim()) {
        return res.status(400).json({
          success: false,
          message: 'A valid status is required'
        });
      }

      if (reason !== undefined && typeof reason !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'reason must be a string'
        });
      }

      if (remarks !== undefined && typeof remarks !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'remarks must be a string'
        });
      }

      const parsedEffectiveDate = effectiveDate === undefined
        ? new Date()
        : new Date(effectiveDate);

      if (Number.isNaN(parsedEffectiveDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'effectiveDate must be a valid date'
        });
      }

      const student = await Student.findOne({ institutionId });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      student.academicStatus.currentStatus = status.trim();
      student.academicStatus.statusRemarks = remarks;
      student.academicStatus.effectiveDate = parsedEffectiveDate;
      await student.save();

      const history = await StudentStatusHistory.create({
        studentId: student._id,
        status: status.trim(),
        reason,
        effectiveDate: parsedEffectiveDate,
        recordedBy: req.user.userId,
        remarks
      });

      await AuditLog.create({
        userId: req.user.userId,
        action: 'UPDATE_STUDENT_STATUS',
        targetType: 'student_status_history',
        targetId: history._id,
        details: {
          institutionId,
          status: history.status
        }
      });

      res.json({
        success: true,
        message: 'Student status updated successfully',
        data: {
          institutionId: student.institutionId,
          status: history.status,
          reason: history.reason,
          effectiveDate: history.effectiveDate,
          recordedBy: history.recordedBy,
          remarks: history.remarks
        }
      });
    } catch (error) {
      console.error('Error updating student status:', error);

      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// Create or update the current faculty evaluation for a student
router.put(
  '/:institutionId/evaluation',
  authenticateToken,
  authorizeRoles('faculty'),
  authorizePermission('submit_evaluations'),
  async (req, res) => {
    try {
      const { institutionId } = req.params;
      const { evaluationStatus, reasons, remarks } = req.body || {};
      const validStatuses = ['eligible', 'not_eligible', 'for_review'];

      if (!validStatuses.includes(evaluationStatus)) {
        return res.status(400).json({
          success: false,
          message: 'A valid evaluationStatus is required'
        });
      }

      if (
        reasons !== undefined &&
        (!Array.isArray(reasons) || reasons.some((reason) => typeof reason !== 'string'))
      ) {
        return res.status(400).json({
          success: false,
          message: 'reasons must be an array of strings'
        });
      }

      if (remarks !== undefined && typeof remarks !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'remarks must be a string'
        });
      }

      const student = await Student.findOne(
        { institutionId },
        { _id: 1 }
      ).lean();

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      let evaluation = await FacultyEvaluation.findOne({
        studentId: student._id
      });

      if (
        evaluation &&
        String(evaluation.facultyId) !== String(req.user.userId)
      ) {
        return res.status(403).json({
          success: false,
          message: 'Evaluation belongs to another faculty member'
        });
      }

      if (!evaluation) {
        evaluation = new FacultyEvaluation({
          studentId: student._id
        });
      }

      evaluation.facultyId = req.user.userId;
      evaluation.evaluationStatus = evaluationStatus;
      if (reasons !== undefined) {
        evaluation.reasons = reasons;
      }
      if (remarks !== undefined) {
        evaluation.remarks = remarks;
      }
      evaluation.evaluatedAt = new Date();
      await evaluation.save();

      await AuditLog.create({
        userId: req.user.userId,
        action: 'UPDATE_FACULTY_EVALUATION',
        targetType: 'faculty_evaluation',
        targetId: evaluation._id,
        details: {
          institutionId,
          evaluationStatus: evaluation.evaluationStatus
        }
      });

      res.json({
        success: true,
        message: 'Evaluation saved successfully',
        data: {
          id: evaluation._id,
          studentId: evaluation.studentId,
          facultyId: evaluation.facultyId,
          evaluationStatus: evaluation.evaluationStatus,
          reasons: evaluation.reasons,
          remarks: evaluation.remarks,
          evaluatedAt: evaluation.evaluatedAt
        }
      });
    } catch (error) {
      console.error('Error saving faculty evaluation:', error);

      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// Enrollment totals for College of Technologies programs
router.get(
  '/search',
  authenticateToken,
  authorizeRoles('admin', 'faculty'),
  authorizeAnyPermission('view_student_records', 'view_reports'),
  async (req, res) => {
    try {
      const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (!query) {
        return res.json({ success: true, data: { students: [] } });
      }
      if (query.length > 100) {
        return res.status(400).json({ success: false, message: 'Search query is too long' });
      }

      const escapedQuery = escapeRegex(query);
      const matchingText = new RegExp(escapedQuery, 'i');
      const matchingIdPrefix = new RegExp(`^${escapedQuery}`, 'i');
      const students = await Student.find({
        accountStatus: 'active',
        $or: [
          { institutionId: matchingIdPrefix },
          { username: matchingText },
          { 'personalInformation.firstName': matchingText },
          { 'personalInformation.lastName': matchingText },
          {
            $expr: {
              $regexMatch: {
                input: {
                  $concat: [
                    { $ifNull: ['$personalInformation.firstName', ''] },
                    ' ',
                    { $ifNull: ['$personalInformation.lastName', ''] }
                  ]
                },
                regex: escapedQuery,
                options: 'i'
              }
            }
          }
        ]
      }, {
        institutionId: 1,
        username: 1,
        'personalInformation.firstName': 1,
        'personalInformation.lastName': 1
      })
        .sort({ institutionId: 1 })
        .limit(8)
        .lean();

      return res.json({
        success: true,
        data: {
          students: students.map((student) => ({
            institutionId: student.institutionId,
            username: student.username || '',
            firstName: student.personalInformation?.firstName || '',
            lastName: student.personalInformation?.lastName || ''
          }))
        }
      });
    } catch (error) {
      console.error('Error searching student suggestions:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

router.get(
  '/courses/enrollment-summary',
  authenticateToken,
  authorizeRoles('admin', 'faculty'),
  authorizeAnyPermission('view_student_records', 'view_reports'),
  async (req, res) => {
    try {
      const [programCounts, pendingStudents, totalActiveStudents] = await Promise.all([
        Student.aggregate([
          {
            $match: {
              accountStatus: 'active',
              'classification.program': { $in: TECHNOLOGY_PROGRAMS }
            }
          },
          {
            $group: {
              _id: '$classification.program',
              assignedCount: { $sum: 1 },
              enrolledCount: {
                $sum: { $cond: [{ $eq: ['$enrollmentStatus', 'enrolled'] }, 1, 0] }
              }
            }
          }
        ]),
        Student.find({
          accountStatus: 'active',
          'classification.program': { $in: TECHNOLOGY_PROGRAMS },
          enrollmentStatus: { $in: ['not_enrolled', 'processing'] }
        }, {
          institutionId: 1,
          personalInformation: 1,
          'classification.program': 1,
          yearLevel: 1,
          enrollmentStatus: 1
        }).sort({ institutionId: 1 }).lean(),
        Student.countDocuments({ accountStatus: 'active' })
      ]);

      const countsByProgram = new Map(programCounts.map(({ _id, enrolledCount }) => [_id, enrolledCount]));
      const programs = TECHNOLOGY_PROGRAMS.map((program) => ({
        program,
        count: countsByProgram.get(program) || 0
      }));
      const assignedCount = programCounts.reduce((total, program) => total + program.assignedCount, 0);
      const pendingEnrollmentStudents = pendingStudents.map((student) => ({
        institutionId: student.institutionId,
        name: [student.personalInformation?.firstName, student.personalInformation?.lastName]
          .filter(Boolean)
          .join(' ') || student.institutionId,
        program: student.classification?.program,
        yearLevel: student.yearLevel || null,
        enrollmentStatus: student.enrollmentStatus
      }));

      return res.json({
        success: true,
        data: {
          programs,
          totalActiveStudents,
          pendingEnrollmentCount: pendingEnrollmentStudents.length,
          pendingEnrollmentStudents,
          unassignedCount: Math.max(0, totalActiveStudents - assignedCount)
        }
      });
    } catch (error) {
      console.error('Error generating course enrollment summary:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Paginated institutional student summary (admin only)
router.get(
  '/reports/summary',
  authenticateToken,
  authorizeRoles('admin'),
  authorizePermission('view_reports'),
  async (req, res) => {
    try {
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 20);
      if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          message: 'page must be positive and limit must be an integer from 1 to 100'
        });
      }

      const [total, ipCount, pwdCount, probationCount, evaluatedCounts, students] = await Promise.all([
        Student.countDocuments({}),
        Student.countDocuments({ 'classification.isIP': true }),
        Student.countDocuments({ 'classification.isPWD': true }),
        Student.countDocuments({ 'academicStatus.isOnProbation': true }),
        FacultyEvaluation.aggregate([
          { $group: { _id: '$studentId' } },
          { $count: 'total' }
        ]),
        Student.find({}, {
          institutionId: 1,
          personalInformation: 1,
          enrollmentInformation: 1,
          classification: 1,
          religiousInformation: 1,
          healthInformation: 1,
          academicStatus: 1
        })
          .sort({ institutionId: 1, _id: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()
      ]);

      const studentIds = students.map((student) => student._id);
      const [academicRecords, evaluations] = studentIds.length
        ? await Promise.all([
          AcademicRecord.find(
            { studentId: { $in: studentIds } },
            { studentId: 1, subjects: 1 }
          ).lean(),
          FacultyEvaluation.find({ studentId: { $in: studentIds } })
            .sort({ evaluatedAt: -1 })
            .select('studentId evaluationStatus evaluatedAt')
            .lean()
        ])
        : [[], []];

      const recordsByStudent = new Map();
      for (const record of academicRecords) {
        const studentId = String(record.studentId);
        recordsByStudent.set(studentId, [...(recordsByStudent.get(studentId) || []), record]);
      }

      const evaluationByStudent = new Map();
      for (const evaluation of evaluations) {
        const studentId = String(evaluation.studentId);
        if (!evaluationByStudent.has(studentId)) evaluationByStudent.set(studentId, evaluation);
      }

      return res.json({
        success: true,
        data: {
          students: students.map((student) => {
            const studentRecords = recordsByStudent.get(String(student._id)) || [];
            const evaluation = evaluationByStudent.get(String(student._id));
            return {
              institutionId: student.institutionId,
              personalInformation: student.personalInformation || {},
              classification: student.classification || {},
              religiousInformation: student.religiousInformation || {},
              academicStatus: student.academicStatus || {},
              academicRecordCount: studentRecords.length,
              subjectCount: studentRecords.reduce((count, record) => count + record.subjects.length, 0),
              majorSubjectGwa: calculateMajorSubjectGwa(studentRecords),
              facultyEvaluation: evaluation ? {
                evaluationStatus: evaluation.evaluationStatus,
                evaluatedAt: evaluation.evaluatedAt
              } : null
            };
          }),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          },
          statistics: {
            ip: ipCount,
            pwd: pwdCount,
            probation: probationCount,
            evaluated: evaluatedCounts[0]?.total || 0
          }
        }
      });
    } catch (error) {
      console.error('Error generating institutional student summary:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Get academic records for a student
router.get(
  '/:institutionId/academic-records',
  authenticateToken,
  authorizeRoles('admin', 'faculty'),
  authorizeAnyPermission('manage_academic_records', 'view_student_records'),
  async (req, res) => {
    try {
      const { institutionId } = req.params;
      const student = await Student.findOne(
        { institutionId },
        { _id: 1, institutionId: 1 }
      ).lean();

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      const academicRecords = await AcademicRecord.find(
        { studentId: student._id },
        { _id: 0, academicYear: 1, semester: 1, subjects: 1 }
      )
        .sort({ academicYear: -1, semester: -1 })
        .lean();

      res.json({
        success: true,
        data: {
          student: {
            institutionId: student.institutionId
          },
          academicRecords,
          majorSubjectGwa: calculateMajorSubjectGwa(academicRecords)
        }
      });
    } catch (error) {
      console.error('Error fetching academic records:', error);

      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// Create or replace one academic-year/semester record (admin only)
router.put(
  '/:institutionId/academic-records',
  authenticateToken,
  authorizeRoles('admin'),
  authorizePermission('manage_academic_records'),
  async (req, res) => {
    try {
      const { institutionId } = req.params;
      const academicRecordUpdate = validateAndNormalizeAcademicRecord(req.body);
      if (academicRecordUpdate.error) {
        return res.status(400).json({ success: false, message: academicRecordUpdate.error });
      }

      const student = await Student.findOne(
        { institutionId },
        { _id: 1, institutionId: 1 }
      ).lean();
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      const { academicYear, semester, subjects } = academicRecordUpdate.value;
      const academicRecord = await AcademicRecord.findOneAndUpdate(
        { studentId: student._id, academicYear, semester },
        { $set: { subjects } },
        {
          returnDocument: 'after',
          runValidators: true,
          setDefaultsOnInsert: true,
          upsert: true
        }
      );

      await AuditLog.create({
        userId: req.user.userId,
        action: 'ACADEMIC_RECORD_SAVED',
        targetType: 'academic_record',
        targetId: academicRecord._id,
        details: {
          institutionId: student.institutionId,
          academicYear,
          semester,
          subjectCount: subjects.length
        }
      });

      return res.json({
        success: true,
        message: 'Academic record saved successfully',
        data: {
          academicYear: academicRecord.academicYear,
          semester: academicRecord.semester,
          subjects: academicRecord.subjects
        }
      });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'An academic record already exists for this year and semester'
        });
      }
      console.error('Error saving academic record:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Get the evaluation report for a student
router.get(
  '/:institutionId/report',
  authenticateToken,
  authorizeRoles('admin', 'faculty'),
  authorizeAnyPermission('view_reports', 'view_student_records'),
  async (req, res) => {
    try {
      const { institutionId } = req.params;
      const studentRecord = await Student.findOne(
        { institutionId },
        {
          _id: 1,
          institutionId: 1,
          personalInformation: 1,
          enrollmentInformation: 1,
          classification: 1,
          religiousInformation: 1,
          healthInformation: 1,
          academicStatus: 1
        }
      ).lean();

      if (!studentRecord) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      const { _id: studentId, ...student } = studentRecord;
      if (req.user.role === 'faculty' && student.healthInformation) {
        student.healthInformation = {
          hasRelevantHealthConcern: Boolean(student.healthInformation.hasRelevantHealthConcern),
          accommodationRequired: Boolean(student.healthInformation.accommodationRequired),
          accommodationNotes: student.healthInformation.accommodationNotes || ''
        };
      }
      if (req.user.role === 'faculty') {
        const activities = student.religiousInformation?.shareSpiritualSchedule ? student.religiousInformation.spiritualActivities || [] : [];
        delete student.religiousInformation;
        student.schedulingRestrictions = activities;
      }

      const [academicRecords, facultyEvaluation, statusHistory] = await Promise.all([
        AcademicRecord.find(
          { studentId },
          { _id: 0, academicYear: 1, semester: 1, subjects: 1 }
        ).sort({ academicYear: -1, semester: -1 }).lean(),
        FacultyEvaluation.findOne({ studentId })
          .sort({ evaluatedAt: -1 })
          .populate('facultyId', 'username role')
          .select('-_id facultyId evaluationStatus reasons remarks evaluatedAt')
          .lean(),
        StudentStatusHistory.find(
          { studentId },
          { _id: 0, status: 1, reason: 1, effectiveDate: 1, recordedBy: 1, remarks: 1 }
        )
          .sort({ effectiveDate: -1 })
          .populate('recordedBy', 'username role')
          .lean()
      ]);

      const majorSubjectGwa = calculateMajorSubjectGwa(academicRecords);

      res.json({
        success: true,
        data: {
          student,
          academicRecords,
          majorSubjectGwa,
          facultyEvaluation,
          statusHistory
        }
      });
    } catch (error) {
      console.error('Error generating student report:', error);

      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// Get a student by institution ID
router.get(
  '/:institutionId',
  authenticateToken,
  authorizeRoles('admin', 'faculty'),
  authorizeAnyPermission('manage_academic_records', 'view_student_records'),
  async (req, res) => {
  try {
    const { institutionId } = req.params;

    const student = await Student.findOne({
      institutionId
    }).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error fetching student:', error);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
  }
);

// Update student profile (admin only)
router.put(
  '/:institutionId',
  authenticateToken,
  authorizeRoles('admin'),
  authorizePermission('manage_academic_records'),
  async (req, res) => {
    try {
      const { institutionId } = req.params;
      const body = req.body || {};
      const profileUpdate = validateAndNormalizeStudentProfile(body, { allowClassification: true });
      if (profileUpdate.error) {
        return res.status(400).json({ success: false, message: profileUpdate.error });
      }
      const updateFields = Object.keys(profileUpdate.value);

      const student = await Student.findOne({ institutionId });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      for (const sectionName of updateFields) {
        if (!student[sectionName]) student[sectionName] = {};
        Object.assign(student[sectionName], profileUpdate.value[sectionName]);
      }

      await student.save();

      await AuditLog.create({
        userId: req.user.userId,
        action: 'UPDATE_STUDENT_PROFILE',
        targetType: 'student',
        targetId: student._id,
        details: {
          institutionId,
          updatedFields: updateFields
        }
      });

      res.json({
        success: true,
        message: 'Student profile updated successfully',
        data: student
      });
    } catch (error) {
      console.error('Error updating student profile:', error);

      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

module.exports = router;
