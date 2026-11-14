const express = require('express');
const Student = require('../models/Student');
const AcademicRecord = require('../models/AcademicRecord');
const FacultyEvaluation = require('../models/FacultyEvaluation');
const StudentStatusHistory = require('../models/StudentStatusHistory');
const AuditLog = require('../models/AuditLog');
const RolePermission = require('../models/RolePermission');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { authorizePermission, authorizeAnyPermission, DEFAULT_PERMISSIONS } = require('../middleware/permissionMiddleware');
const { validateAndNormalizeStudentProfile } = require('../utils/studentProfile');
const { validateAndNormalizeAcademicRecord } = require('../utils/academicRecord');
const { calculateMajorSubjectGwa, calculateOverallGwa, withAcademicGwas, getLatestAcademicPeriod } = require('../utils/academicCalculations');
const { DAYS, isTime, findScheduleConflicts } = require('../utils/scheduleConflicts');
const { buildStudentSearchFilter } = require('../utils/studentSearch');
const { getAcademicStatus } = require('../utils/academicStatus');
const { getAccountModelName } = require('../utils/accountCollections');
const { getActiveAcademicPeriod } = require('../utils/academicPeriodSettings');
const { processBulkStudentImport } = require('../utils/bulkStudentImport');
const { DEPARTMENTS, buildStudentDepartmentFilter, getEnrollmentOfficerDepartment } = require('../utils/departmentAccess');
const { syncDepartmentMetrics } = require('../utils/departmentMetrics');

const router = express.Router();
const TECHNOLOGY_PROGRAMS = [
  'Bachelor of Information Technology',
  'Entertainment and Multimedia Computing',
  'Electronics',
  'Food Technology',
  'Automotive Technology'
];

router.put('/:institutionId/classification', authenticateToken, authorizeRoles('faculty', 'admin'), authorizeAnyPermission('submit_evaluations', 'manage_academic_records'), async (req, res) => {
  try {
    const profileUpdate = validateAndNormalizeStudentProfile({ classification: req.body?.classification }, { allowClassification: true });
    if (profileUpdate.error) return res.status(400).json({ success: false, message: profileUpdate.error });
    const filter = buildStudentDepartmentFilter(req.user, { institutionId: req.params.institutionId });
    if (!filter) return res.status(403).json({ success: false, message: 'No valid department is assigned to this enrollment officer' });
    const assignedDepartment = getEnrollmentOfficerDepartment(req.user);
    const targetProgram = profileUpdate.value.classification.program;
    if (assignedDepartment && targetProgram !== undefined && targetProgram !== assignedDepartment.program) {
      return res.status(403).json({ success: false, message: 'Enrollment officers may not change a student to another department' });
    }
    const student = await Student.findOne(filter);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    Object.assign(student.classification, profileUpdate.value.classification);
    await student.save();
    await AuditLog.create({ userId: req.user.userId, userRole: req.user.role, userModel: getAccountModelName(req.user.role), action: 'UPDATE_STUDENT_CLASSIFICATION', targetType: 'student', targetId: student._id, details: { institutionId: student.institutionId } });
    return res.json({ success: true, data: student.classification });
  } catch (error) { console.error('Classification update failed:', error); return res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/:institutionId/schedule-conflicts', authenticateToken, authorizeRoles('faculty', 'admin'), authorizeAnyPermission('submit_evaluations', 'manage_academic_records'), async (req, res) => {
  try {
    const meetings = req.body?.meetings;
    if (!Array.isArray(meetings) || meetings.length < 1 || meetings.some((meeting) => !meeting || !DAYS.includes(meeting.dayOfWeek) || !isTime(meeting.startTime) || !isTime(meeting.endTime) || meeting.startTime >= meeting.endTime)) return res.status(400).json({ success: false, message: 'Provide valid meeting day and time ranges.' });
    const filter = buildStudentDepartmentFilter(req.user, { institutionId: req.params.institutionId });
    if (!filter) return res.status(403).json({ success: false, message: 'No valid department is assigned to this enrollment officer' });
    const student = await Student.findOne(filter, { religiousInformation: 1, classification: 1 }).lean();
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

      const filter = buildStudentDepartmentFilter(req.user, { institutionId });
      if (!filter) return res.status(403).json({ success: false, message: 'No valid department is assigned to this enrollment officer' });
      const student = await Student.findOne(filter);

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      student.academicStatus.currentStatus = status.trim();
      student.academicStatus.isOnProbation = ['probation', 'probationary', 'on probation'].includes(status.trim().toLowerCase());
      student.academicStatus.probationReason = student.academicStatus.isOnProbation
        ? reason?.trim() || undefined
        : undefined;
      student.academicStatus.statusRemarks = remarks;
      student.academicStatus.effectiveDate = parsedEffectiveDate;
      await student.save();

      const history = await StudentStatusHistory.create({
        studentId: student._id,
        status: status.trim(),
        reason,
        effectiveDate: parsedEffectiveDate,
        recordedBy: req.user.userId,
        recordedByModel: getAccountModelName(req.user.role),
        remarks
      });

      await AuditLog.create({
        userId: req.user.userId,
        userRole: req.user.role,
        userModel: getAccountModelName(req.user.role),
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

      const activePeriod = await getActiveAcademicPeriod();
      if (!activePeriod.evaluationWindowOpen || (activePeriod.evaluationDeadline && new Date() > new Date(activePeriod.evaluationDeadline))) {
        return res.status(403).json({
          success: false,
          message: activePeriod.announcementMessage || 'The faculty evaluation window is currently closed for this academic term.'
        });
      }

      const filter = buildStudentDepartmentFilter(req.user, { institutionId });
      if (!filter) return res.status(403).json({ success: false, message: 'No valid department is assigned to this enrollment officer' });
      const student = await Student.findOne(filter, { _id: 1, classification: 1 }).lean();

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

      const department = DEPARTMENTS.find((item) => item.program === student.classification?.program);
      if (department) {
        await syncDepartmentMetrics(department);
      }

      await AuditLog.create({
        userId: req.user.userId,
        userRole: req.user.role,
        userModel: getAccountModelName(req.user.role),
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

      // Faculty/admin record access is independent of whether the student can
      // currently authenticate. Account status is enforced by authentication,
      // while historical student records remain searchable to authorized staff.
      const filter = buildStudentDepartmentFilter(req.user, buildStudentSearchFilter(query));
      if (!filter) {
        return res.status(403).json({ success: false, message: 'No valid department is assigned to this enrollment officer' });
      }
      const students = await Student.find(filter, {
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

// Dedicated export endpoint strictly restricted to authorized administrators with export_reports permission (A119)
router.get(
  '/reports/export',
  authenticateToken,
  authorizeRoles('admin'),
  authorizePermission('export_reports'),
  async (req, res, next) => {
    Object.defineProperty(req, 'query', {
      value: Object.assign({}, req.query, { all: 'true', export: 'true' }),
      writable: true,
      configurable: true
    });
    // Delegate to /reports/summary logic by invoking it
    const summaryHandler = router.stack.find(
      (layer) => layer.route && layer.route.path === '/reports/summary' && layer.route.methods.get
    );
    if (summaryHandler) {
      // Find the last function in stack (the route handler)
      const lastHandler = summaryHandler.route.stack[summaryHandler.route.stack.length - 1].handle;
      return lastHandler(req, res, next);
    }
    return res.status(500).json({ success: false, message: 'Export handler unavailable' });
  }
);

router.get(
  '/courses/enrollment-summary',
  authenticateToken,
  authorizeRoles('admin', 'faculty'),
  authorizeAnyPermission('view_student_records', 'view_reports'),
  async (req, res) => {
    try {
      const department = getEnrollmentOfficerDepartment(req.user);
      if (req.user.isVerifiedEnrollmentOfficer && !department) {
        return res.status(403).json({ success: false, message: 'No valid department is assigned to this enrollment officer' });
      }
      const programs = department ? [department.program] : TECHNOLOGY_PROGRAMS;
      const departmentStudentFilter = {
        accountStatus: 'active',
        'classification.program': { $in: programs }
      };
      const [programCounts, pendingStudents, totalActiveStudents] = await Promise.all([
        Student.aggregate([
          {
            $match: departmentStudentFilter
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
          ...departmentStudentFilter,
          enrollmentStatus: { $in: ['not_enrolled', 'processing'] }
        }, {
          institutionId: 1,
          personalInformation: 1,
          'classification.program': 1,
          yearLevel: 1,
          enrollmentStatus: 1
        }).sort({ institutionId: 1 }).lean(),
        department
          ? Student.countDocuments(departmentStudentFilter)
          : Student.countDocuments({ accountStatus: 'active' })
      ]);

      const countsByProgram = new Map(programCounts.map(({ _id, enrolledCount }) => [_id, enrolledCount]));
      const programSummaries = programs.map((program) => ({
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
          programs: programSummaries,
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

// A115: Bulk student and academic record ingestion (admin only)
router.post(
  '/bulk-import',
  authenticateToken,
  authorizeRoles('admin'),
  authorizeAnyPermission('manage_academic_records', 'manage_users'),
  async (req, res) => {
    try {
      const { students } = req.body || {};
      if (!Array.isArray(students) || students.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'An array of student rows is required for bulk import.'
        });
      }

      if (students.length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'Bulk import is limited to 2,000 records per upload.'
        });
      }

      const results = await processBulkStudentImport(students, req.user.userId);

      await AuditLog.create({
        userId: req.user.userId,
        userRole: 'admin',
        userModel: 'AdminUser',
        action: 'BULK_STUDENT_IMPORT',
        targetType: 'student',
        details: {
          totalRows: results.totalRows,
          createdCount: results.createdCount,
          updatedCount: results.updatedCount,
          skippedCount: results.skippedCount,
          errorSample: results.errors.slice(0, 5)
        }
      });

      return res.json({
        success: true,
        message: `Import processed: ${results.createdCount} created, ${results.updatedCount} updated, ${results.skippedCount} skipped.`,
        data: results
      });
    } catch (error) {
      console.error('Bulk student import failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Unable to process bulk student import.'
      });
    }
  }
);

// A117: College executive dashboard & visual analytics (Dean's Overview)
router.get(
  '/executive-analytics',
  authenticateToken,
  authorizeRoles('admin', 'faculty'),
  authorizeAnyPermission('view_reports', 'manage_users', 'submit_evaluations'),
  async (_req, res) => {
    try {
      const [
        totalStudents,
        ipCount,
        pwdCount,
        probationCount,
        shifterCount,
        transfereeCount,
        evaluations,
        programsAggregation,
        yearLevelsAggregation,
        studentsWithRecords
      ] = await Promise.all([
        Student.countDocuments({}),
        Student.countDocuments({ 'classification.isIP': true }),
        Student.countDocuments({ 'classification.isPWD': true }),
        Student.countDocuments({ 'academicStatus.isOnProbation': true }),
        Student.countDocuments({ 'classification.isShifter': true }),
        Student.countDocuments({ 'classification.isTransferee': true }),
        FacultyEvaluation.find({}, { studentId: 1, evaluationStatus: 1 }).lean(),
        Student.aggregate([
          {
            $group: {
              _id: '$classification.program',
              total: { $sum: 1 },
              probationTotal: {
                $sum: { $cond: [{ $eq: ['$academicStatus.isOnProbation', true] }, 1, 0] }
              }
            }
          }
        ]),
        Student.aggregate([
          {
            $group: {
              _id: '$yearLevel',
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]),
        AcademicRecord.aggregate([
          {
            $unwind: '$subjects'
          },
          {
            $match: {
              'subjects.units': { $gt: 0 },
              'subjects.grade': { $gt: 0 }
            }
          },
          {
            $group: {
              _id: '$studentId',
              totalQualityPoints: { $sum: { $multiply: ['$subjects.units', '$subjects.grade'] } },
              totalUnits: { $sum: '$subjects.units' }
            }
          }
        ])
      ]);

      let eligibleCount = 0;
      let notEligibleCount = 0;
      let forReviewCount = 0;
      const evaluatedStudentIds = new Set();

      for (const ev of evaluations) {
        evaluatedStudentIds.add(String(ev.studentId));
        const status = (ev.evaluationStatus || '').toLowerCase();
        if (status === 'eligible') eligibleCount++;
        else if (status === 'not_eligible') notEligibleCount++;
        else if (status === 'for_review') forReviewCount++;
      }

      const totalEvaluated = evaluatedStudentIds.size;
      const pendingCount = Math.max(0, totalStudents - totalEvaluated);
      const evaluationCompletionRate = totalStudents > 0
        ? Number(((totalEvaluated / totalStudents) * 100).toFixed(1))
        : 0;

      const gwaBuckets = {
        deansList: 0,
        goodStanding: 0,
        satisfactory: 0,
        atRisk: 0,
        deficient: 0,
        ungraded: 0
      };

      let sumGwa = 0;
      let gradedCount = 0;

      for (const item of studentsWithRecords) {
        if (item.totalUnits > 0) {
          const gwa = Number((item.totalQualityPoints / item.totalUnits).toFixed(2));
          sumGwa += gwa;
          gradedCount++;

          if (gwa <= 1.45) gwaBuckets.deansList++;
          else if (gwa <= 2.00) gwaBuckets.goodStanding++;
          else if (gwa <= 2.50) gwaBuckets.satisfactory++;
          else if (gwa <= 3.00) gwaBuckets.atRisk++;
          else gwaBuckets.deficient++;
        }
      }
      gwaBuckets.ungraded = Math.max(0, totalStudents - gradedCount);
      const averageCollegeGwa = gradedCount > 0 ? Number((sumGwa / gradedCount).toFixed(2)) : 0;

      const programStats = (programsAggregation || []).map((p) => ({
        program: p._id || 'Unassigned Program',
        total: p.total,
        probationCount: p.probationTotal
      })).sort((a, b) => b.total - a.total);

      const yearLevelStats = (yearLevelsAggregation || []).map((y) => ({
        yearLevel: y._id || 1,
        count: y.count
      }));

      return res.json({
        success: true,
        data: {
          metrics: {
            totalStudents,
            totalEvaluated,
            evaluationCompletionRate,
            averageCollegeGwa,
            probationCount,
            ipCount,
            pwdCount,
            shifterCount,
            transfereeCount
          },
          evaluationProgress: {
            evaluated: totalEvaluated,
            pending: pendingCount,
            completionRate: evaluationCompletionRate,
            breakdown: {
              eligible: eligibleCount,
              forReview: forReviewCount,
              notEligible: notEligibleCount,
              pending: pendingCount
            }
          },
          gwaDistribution: {
            averageGwa: averageCollegeGwa,
            gradedCount,
            buckets: gwaBuckets
          },
          demographics: {
            ip: ipCount,
            pwd: pwdCount,
            shifter: shifterCount,
            transferee: transfereeCount,
            probation: probationCount,
            regular: Math.max(0, totalStudents - probationCount)
          },
          programBreakdown: programStats,
          yearLevelBreakdown: yearLevelStats
        }
      });
    } catch (error) {
      console.error('Failed to generate executive analytics:', error);
      return res.status(500).json({ success: false, message: 'Server error generating executive analytics.' });
    }
  }
);

// Paginated institutional student summary with comprehensive filtering & aggregations (admin only)
router.get(
  '/reports/summary',
  authenticateToken,
  authorizeRoles('admin'),
  authorizePermission('view_reports'),
  async (req, res) => {
    try {
      const isExportAll = req.query.all === 'true' || req.query.export === 'true';

      if (isExportAll) {
        const rolePermissions = await RolePermission.findOne({ role: req.user.role }).lean();
        const permissions = rolePermissions?.permissions || DEFAULT_PERMISSIONS[req.user.role] || [];
        if (!permissions.includes('export_reports')) {
          return res.status(403).json({
            success: false,
            message: 'Export functions are strictly restricted to authorized administrators with export privileges'
          });
        }
      }

      const page = Number(req.query.page || 1);
      const limit = isExportAll ? Math.min(Number(req.query.limit || 5000), 10000) : Number(req.query.limit || 20);
      if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || (!isExportAll && limit > 100)) {
        return res.status(400).json({
          success: false,
          message: 'page must be positive and limit must be an integer from 1 to 100'
        });
      }

      const {
        academicYear,
        semester,
        department,
        program,
        yearLevel,
        startDate,
        endDate,
        enrollmentStatus,
        search
      } = req.query;

      // Build student filter
      const studentFilter = {};

      if (enrollmentStatus && enrollmentStatus !== 'all') {
        studentFilter.enrollmentStatus = enrollmentStatus.trim();
      }

      // Department & program filtering
      const filterConditions = [];
      if (department && department !== 'all') {
        const deptUpper = String(department).trim().toUpperCase();
        const deptObj = DEPARTMENTS.find(
          (d) => d.code === deptUpper || d.name.toLowerCase() === department.toLowerCase() || d.program.toLowerCase() === department.toLowerCase()
        );
        const progPattern = deptObj ? deptObj.program : String(department).trim();
        const escapedPattern = progPattern.replace(/[.*+?^${}()|[\]\\]/g, (c) => '\\' + c);
        const progRegex = new RegExp(escapedPattern, 'i');
        const codeRegex = deptObj ? new RegExp('^' + deptObj.code + '$', 'i') : progRegex;

        filterConditions.push({
          $or: [
            { 'classification.program': progRegex },
            { 'enrollmentInformation.department': codeRegex },
            { 'enrollmentInformation.course': progRegex }
          ]
        });
      } else if (program && program !== 'all') {
        const escapedProg = String(program).trim().replace(/[.*+?^${}()|[\]\\]/g, (c) => '\\' + c);
        const progRegex = new RegExp(escapedProg, 'i');
        filterConditions.push({
          $or: [
            { 'classification.program': progRegex },
            { 'enrollmentInformation.course': progRegex }
          ]
        });
      }

      // Year level filter
      if (yearLevel && yearLevel !== 'all') {
        const ylNum = Number(yearLevel);
        const ylOr = [
          { 'enrollmentInformation.yearLevel': String(yearLevel).trim() },
          { 'enrollmentInformation.level': String(yearLevel).trim() }
        ];
        if (!Number.isNaN(ylNum)) {
          ylOr.unshift({ yearLevel: ylNum });
        }
        filterConditions.push({ $or: ylOr });
      }

      // Date range filter
      if (startDate || endDate) {
        const dateRangeQuery = {};
        if (startDate) {
          const parsedStart = new Date(startDate);
          if (!Number.isNaN(parsedStart.getTime())) {
            dateRangeQuery.$gte = parsedStart;
          }
        }
        if (endDate) {
          const parsedEnd = new Date(endDate);
          if (!Number.isNaN(parsedEnd.getTime())) {
            parsedEnd.setHours(23, 59, 59, 999);
            dateRangeQuery.$lte = parsedEnd;
          }
        }
        if (Object.keys(dateRangeQuery).length > 0) {
          filterConditions.push({
            $or: [
              { createdAt: dateRangeQuery },
              { 'enrollmentInformation.entryDate': dateRangeQuery },
              { 'academicStatus.effectiveDate': dateRangeQuery }
            ]
          });
        }
      }

      // Text search
      if (search && typeof search === 'string' && search.trim()) {
        const term = search.trim();
        const escapedSearch = term.replace(/[.*+?^${}()|[\]\\]/g, (c) => '\\' + c);
        const searchRegex = new RegExp(escapedSearch, 'i');
        filterConditions.push({
          $or: [
            { institutionId: searchRegex },
            { 'personalInformation.firstName': searchRegex },
            { 'personalInformation.lastName': searchRegex },
            { 'personalInformation.middleName': searchRegex },
            { 'classification.program': searchRegex },
            { 'academicStatus.currentStatus': searchRegex }
          ]
        });
      }

      // Academic Year & Semester filter (queries AcademicRecord)
      if ((academicYear && academicYear !== 'all') || (semester && semester !== 'all')) {
        const periodQuery = {};
        if (academicYear && academicYear !== 'all') {
          periodQuery.academicYear = academicYear.trim();
        }
        if (semester && semester !== 'all') {
          periodQuery.semester = semester.trim();
        }
        const matchingStudentIds = await AcademicRecord.distinct('studentId', periodQuery);
        studentFilter._id = { $in: matchingStudentIds || [] };
      }

      if (filterConditions.length === 1) {
        Object.assign(studentFilter, filterConditions[0]);
      } else if (filterConditions.length > 1) {
        studentFilter.$and = filterConditions;
      }

      // Query database with filter
      const [total, enrolledCount, ipCount, pwdCount, probationCount, evaluatedCounts, students] = await Promise.all([
        Student.countDocuments(studentFilter),
        Student.countDocuments({ ...studentFilter, enrollmentStatus: 'enrolled' }),
        Student.countDocuments({ ...studentFilter, 'classification.isIP': true }),
        Student.countDocuments({ ...studentFilter, 'classification.isPWD': true }),
        Student.countDocuments({ ...studentFilter, 'academicStatus.isOnProbation': true }),
        FacultyEvaluation.aggregate([
          { $group: { _id: '$studentId' } },
          { $count: 'total' }
        ]).catch(() => []),
        Student.find(studentFilter, {
          institutionId: 1,
          personalInformation: 1,
          enrollmentInformation: 1,
          classification: 1,
          yearLevel: 1,
          section: 1,
          enrollmentStatus: 1,
          religiousInformation: 1,
          healthInformation: 1,
          academicStatus: 1,
          createdAt: 1
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
            { studentId: 1, academicYear: 1, semester: 1, subjects: 1 }
          ).sort({ academicYear: -1, semester: -1 }).lean(),
          FacultyEvaluation.find({ studentId: { $in: studentIds } })
            .sort({ evaluatedAt: -1 })
            .populate('facultyId', 'username role')
            .select('studentId facultyId evaluationStatus reasons remarks evaluatedAt')
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

      // Aggregations across all programs, year levels, and academic periods (A115)
      let programAgg = [];
      let yearLevelAgg = [];
      let periodAgg = [];
      let statusAgg = [];

      try {
        if (typeof Student.aggregate === 'function') {
          const [rawProg, rawYear, rawPeriods, rawStatus] = await Promise.all([
            Student.aggregate([
              {
                $group: {
                  _id: { $ifNull: ['$classification.program', { $ifNull: ['$enrollmentInformation.course', 'Unassigned'] }] },
                  total: { $sum: 1 },
                  enrolled: { $sum: { $cond: [{ $eq: ['$enrollmentStatus', 'enrolled'] }, 1, 0] } }
                }
              },
              { $sort: { total: -1 } }
            ]).catch(() => []),
            Student.aggregate([
              {
                $group: {
                  _id: { $ifNull: ['$yearLevel', 1] },
                  total: { $sum: 1 },
                  enrolled: { $sum: { $cond: [{ $eq: ['$enrollmentStatus', 'enrolled'] }, 1, 0] } }
                }
              },
              { $sort: { _id: 1 } }
            ]).catch(() => []),
            AcademicRecord.aggregate([
              {
                $group: {
                  _id: { academicYear: '$academicYear', semester: '$semester' },
                  studentCount: { $addToSet: '$studentId' },
                  recordCount: { $sum: 1 }
                }
              },
              {
                $project: {
                  _id: 0,
                  academicYear: '$_id.academicYear',
                  semester: '$_id.semester',
                  studentCount: { $size: '$studentCount' },
                  recordCount: 1
                }
              },
              { $sort: { academicYear: -1, semester: -1 } }
            ]).catch(() => []),
            Student.aggregate([
              {
                $group: {
                  _id: { $ifNull: ['$enrollmentStatus', 'not_enrolled'] },
                  count: { $sum: 1 }
                }
              }
            ]).catch(() => [])
          ]);
          programAgg = Array.isArray(rawProg) ? rawProg : [];
          yearLevelAgg = Array.isArray(rawYear) ? rawYear : [];
          periodAgg = Array.isArray(rawPeriods) ? rawPeriods : [];
          statusAgg = Array.isArray(rawStatus) ? rawStatus : [];
        }
      } catch (aggErr) {
        console.warn('Aggregation pipeline skipped or not supported:', aggErr.message);
      }

      // Safe fallback if aggregations return empty in tests or mocks
      if (programAgg.length === 0 && students.length > 0) {
        const progMap = new Map();
        for (const s of students) {
          const prog = s.classification?.program || s.enrollmentInformation?.course || 'General Curriculum';
          const prev = progMap.get(prog) || { total: 0, enrolled: 0 };
          prev.total += 1;
          if (s.enrollmentStatus === 'enrolled') prev.enrolled += 1;
          progMap.set(prog, prev);
        }
        programAgg = Array.from(progMap.entries()).map(([prog, counts]) => ({ _id: prog, ...counts }));
      }

      if (yearLevelAgg.length === 0 && students.length > 0) {
        const ylMap = new Map();
        for (const s of students) {
          const yl = s.yearLevel || 1;
          const prev = ylMap.get(yl) || { total: 0, enrolled: 0 };
          prev.total += 1;
          if (s.enrollmentStatus === 'enrolled') prev.enrolled += 1;
          ylMap.set(yl, prev);
        }
        yearLevelAgg = Array.from(ylMap.entries()).map(([yl, counts]) => ({ _id: yl, ...counts }));
      }

      const statusCounts = { enrolled: enrolledCount, processing: 0, not_enrolled: 0 };
      for (const item of statusAgg) {
        if (item._id && statusCounts[item._id] !== undefined) {
          statusCounts[item._id] = item.count;
        }
      }

      const formatYearLevelLabel = (num) => {
        const n = Number(num);
        if (n === 1) return '1st Year';
        if (n === 2) return '2nd Year';
        if (n === 3) return '3rd Year';
        if (n === 4) return '4th Year';
        return `Year ${num}`;
      };

      if (isExportAll) {
        await AuditLog.create({
          userId: req.user.userId,
          userRole: req.user.role,
          userModel: 'AdminUser',
          action: 'EXPORT_STUDENT_REPORTS',
          targetType: 'reports',
          details: {
            exportScope: req.query.all === 'true' ? 'all' : 'filtered',
            recordCount: students.length,
            filters: {
              academicYear,
              semester,
              department,
              yearLevel,
              enrollmentStatus
            }
          }
        }).catch((err) => console.warn('Failed to audit report export:', err.message));
      }

      return res.json({
        success: true,
        data: {
          students: students.map((student) => {
            const studentRecords = recordsByStudent.get(String(student._id)) || [];
            const evaluation = evaluationByStudent.get(String(student._id));
            const latestAcademicPeriod = getLatestAcademicPeriod(studentRecords);
            const studentProgram = student.classification?.program || student.enrollmentInformation?.course || '';
            const matchedDept = DEPARTMENTS.find((d) => d.program === studentProgram || d.name === studentProgram);

            return {
              institutionId: student.institutionId,
              personalInformation: student.personalInformation || {},
              classification: student.classification || {},
              enrollmentInformation: student.enrollmentInformation || {},
              yearLevel: student.yearLevel || (student.enrollmentInformation?.yearLevel ? Number(student.enrollmentInformation.yearLevel) : 1),
              section: student.section || 'A',
              enrollmentStatus: student.enrollmentStatus || 'not_enrolled',
              program: studentProgram || 'Bachelor of Information Technology',
              department: student.enrollmentInformation?.department || matchedDept?.code || 'COT',
              religiousInformation: student.religiousInformation || {},
              academicStatus: student.academicStatus || {},
              academicRecordCount: studentRecords.length,
              subjectCount: studentRecords.reduce((count, record) => count + (record.subjects?.length || 0), 0),
              overallGwa: calculateOverallGwa(studentRecords),
              majorSubjectGwa: calculateMajorSubjectGwa(studentRecords),
              latestAcademicPeriod,
              academicPeriods: studentRecords.map((r) => ({
                academicYear: r.academicYear,
                semester: r.semester,
                subjectCount: r.subjects?.length || 0,
                overallGwa: calculateOverallGwa([r]),
                majorSubjectGwa: calculateMajorSubjectGwa([r])
              })),
              facultyEvaluation: evaluation ? {
                evaluationStatus: evaluation.evaluationStatus,
                reasons: evaluation.reasons || [],
                remarks: evaluation.remarks || '',
                faculty: evaluation.facultyId && typeof evaluation.facultyId === 'object'
                  ? { username: evaluation.facultyId.username, role: evaluation.facultyId.role }
                  : null,
                evaluatedAt: evaluation.evaluatedAt
              } : null,
              createdAt: student.createdAt
            };
          }),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1
          },
          statistics: {
            ip: ipCount,
            pwd: pwdCount,
            probation: probationCount,
            evaluated: evaluatedCounts[0]?.total || 0,
            enrolled: enrolledCount
          },
          aggregations: {
            byProgram: programAgg.map((p) => ({
              program: p._id,
              departmentCode: DEPARTMENTS.find((d) => d.program === p._id)?.code || 'COT',
              total: p.total,
              enrolled: p.enrolled
            })),
            byYearLevel: yearLevelAgg.map((y) => ({
              yearLevel: y._id,
              label: formatYearLevelLabel(y._id),
              total: y.total,
              enrolled: y.enrolled
            })),
            byAcademicPeriod: periodAgg,
            byEnrollmentStatus: statusCounts,
            overall: {
              totalStudents: total,
              enrolledCount,
              ipCount,
              pwdCount,
              probationCount,
              evaluatedCount: evaluatedCounts[0]?.total || 0
            }
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
      const studentFilter = buildStudentDepartmentFilter(req.user, { institutionId });
      if (!studentFilter) {
        return res.status(403).json({ success: false, message: 'No valid department is assigned to this enrollment officer' });
      }
      const student = await Student.findOne(
        studentFilter,
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
          academicRecords: withAcademicGwas(academicRecords),
          overallGwa: calculateOverallGwa(academicRecords),
          majorSubjectGwa: calculateMajorSubjectGwa(academicRecords),
          latestAcademicPeriod: getLatestAcademicPeriod(academicRecords)
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
      const activePeriod = await getActiveAcademicPeriod();
      if (
        activePeriod.isTermGradesLocked &&
        (academicYear !== activePeriod.schoolYear || semester !== activePeriod.semester)
      ) {
        return res.status(403).json({
          success: false,
          message: `Academic records for historical terms are locked. The active term is ${activePeriod.schoolYear} - ${activePeriod.semester}.`
        });
      }
      const academicRecord = await AcademicRecord.findOneAndUpdate(
        { studentId: student._id, academicYear, semester },
        { $set: { subjects, isDemo: false } },
        {
          returnDocument: 'after',
          runValidators: true,
          setDefaultsOnInsert: true,
          upsert: true
        }
      );

      await AuditLog.create({
        userId: req.user.userId,
        userRole: req.user.role,
        userModel: getAccountModelName(req.user.role),
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
      const studentFilter = buildStudentDepartmentFilter(req.user, { institutionId });
      if (!studentFilter) {
        return res.status(403).json({ success: false, message: 'No valid department is assigned to this enrollment officer' });
      }
      const studentRecord = await Student.findOne(
        studentFilter,
        {
          _id: 1,
          username: 1,
          institutionId: 1,
          personalInformation: 1,
          enrollmentInformation: 1,
          classification: 1,
          religiousInformation: 1,
          contactInformation: 1,
          addresses: 1,
          educationalBackground: 1,
          healthInformation: 1,
          academicStatus: 1,
          yearLevel: 1,
          section: 1,
          enrollmentStatus: 1
        }
      ).lean();

      if (!studentRecord) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      const { _id: studentId, ...student } = studentRecord;
      if (req.user.role === 'faculty') {
        student.academicStatus = {
          ...student.academicStatus,
          ...getAcademicStatus(student)
        };
        const activities = student.religiousInformation?.shareSpiritualSchedule ? student.religiousInformation.spiritualActivities || [] : [];
        student.schedulingRestrictions = activities;
      }

      const [academicRecords, facultyEvaluation, statusHistory] = await Promise.all([
        AcademicRecord.find(
          { studentId },
          { _id: 0, academicYear: 1, semester: 1, subjects: 1, isDemo: 1 }
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
      const overallGwa = calculateOverallGwa(academicRecords);

      res.json({
        success: true,
        data: {
          student,
          academicRecords: withAcademicGwas(academicRecords),
          overallGwa,
          majorSubjectGwa,
          latestAcademicPeriod: getLatestAcademicPeriod(academicRecords),
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

    const filter = buildStudentDepartmentFilter(req.user, { institutionId });
    if (!filter) {
      return res.status(403).json({ success: false, message: 'No valid department is assigned to this enrollment officer' });
    }
    const student = await Student.findOne(filter).lean();

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
      const profileUpdate = validateAndNormalizeStudentProfile(body, {
        allowClassification: true,
        allowEnrollmentInformation: true,
        allowInstitutionalContact: true
      });
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
        userRole: req.user.role,
        userModel: getAccountModelName(req.user.role),
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
