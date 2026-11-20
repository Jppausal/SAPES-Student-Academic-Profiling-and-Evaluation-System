const express = require('express');
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const Student = require('../models/Student');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { authorizePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();
const MAX_LIMIT = 100;
const sensitiveDetailKeys = new Set([
  'password',
  'passwordHash',
  'token',
  'jwt',
  'jwtSecret',
  'secret',
  'credentials',
  'mongoUri',
  'connectionString'
]);

const sanitizeDetails = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeDetails);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((safeDetails, [key, detail]) => {
      if (!sensitiveDetailKeys.has(key)) {
        safeDetails[key] = sanitizeDetails(detail);
      }
      return safeDetails;
    }, {});
  }

  return value;
};

const CATEGORY_ACTIONS = {
  SECURITY: [
    'USER_LOGIN',
    'USER_LOGOUT',
    'LOGIN_RATE_LIMITED',
    'TRANSACTION_RATE_LIMITED',
    'PASSWORD_CHANGED',
    'PASSWORD_RESET'
  ],
  USER_MANAGEMENT: [
    'ROLE_PERMISSIONS_UPDATED',
    'SYSTEM_SETTINGS_UPDATED',
    'INTEGRATION_CREDENTIAL_CUSTOMIZED',
    'INTEGRATION_CREDENTIAL_RESET',
    'USER_CREATED',
    'USER_UPDATED',
    'USER_STATUS_UPDATED',
    'ACCOUNT_STATUS_UPDATED'
  ],
  ACADEMIC_RECORD: [
    'RECORD_LOCKED',
    'RECORD_UNLOCKED',
    'LOCK_CONFLICT',
    'UPDATE_STUDENT_STATUS',
    'ACADEMIC_RECORD_SAVED',
    'ACADEMIC_PERIOD_SAVED',
    'EXPORT_STUDENT_REPORTS',
    'EXPORT_STUDENT_REPORTS_FAILED',
    'REPORT_MODIFIED'
  ],
  FACULTY_EVALUATION: [
    'COURSE_EVALUATION_UPDATED',
    'UPDATE_FACULTY_EVALUATION'
  ],
  PROFILE_UPDATE: [
    'UPDATE_STUDENT_CLASSIFICATION',
    'UPDATE_STUDENT_PROFILE',
    'STUDENT_PROFILE_UPDATED'
  ],
  ENROLLMENT: [
    'STUDENT_ENROLLMENT_APPROVED'
  ]
};

const USER_ACTIVITY_CATEGORIES = {
  SECURITY: [
    'USER_LOGIN',
    'LOGIN_RATE_LIMITED',
    'TRANSACTION_RATE_LIMITED',
    'USER_LOGOUT',
    'PASSWORD_CHANGED',
    'PASSWORD_RESET',
    'USER_STATUS_UPDATED',
    'ACCOUNT_STATUS_UPDATED',
    'USER_CREATED'
  ],
  PROFILE: [
    'STUDENT_PROFILE_UPDATED',
    'UPDATE_STUDENT_CLASSIFICATION',
    'UPDATE_STUDENT_PROFILE',
    'USER_UPDATED'
  ],
  ACADEMIC: [
    'RECORD_LOCKED',
    'RECORD_UNLOCKED',
    'LOCK_CONFLICT',
    'UPDATE_STUDENT_STATUS',
    'COURSE_EVALUATION_UPDATED',
    'UPDATE_FACULTY_EVALUATION',
    'ACADEMIC_RECORD_SAVED',
    'EXPORT_STUDENT_REPORTS',
    'EXPORT_STUDENT_REPORTS_FAILED',
    'REPORT_MODIFIED'
  ],
  ENROLLMENT: [
    'STUDENT_ENROLLMENT_APPROVED'
  ]
};

const SECTION_LABELS = {
  personalInformation: 'personal information',
  enrollmentInformation: 'enrollment information',
  contactInformation: 'contact information',
  addresses: 'addresses',
  educationalBackground: 'educational background',
  healthInformation: 'health and medical information',
  classification: 'student classification',
  religiousInformation: 'religious information'
};

function formatHumanReadableActivity(log, currentUser) {
  const viewerId = String(currentUser?.userId || '');
  const logUserId = String(log.userId?._id || log.userId || '');
  const isActor = Boolean(viewerId && logUserId === viewerId);
  const isViewerAdmin = currentUser?.role === 'admin';
  const details = log.details && typeof log.details === 'object' && !Array.isArray(log.details)
    ? log.details
    : {};

  const logUserRole = log.userRole || log.userId?.role || 'user';
  const roleName = logUserRole === 'admin'
    ? 'Administrator'
    : logUserRole === 'faculty'
      ? 'Faculty'
      : logUserRole === 'student'
        ? 'Student'
        : 'System';

  const actorUsername = log.userId?.username || details.username || '';
  let actorLabel = 'You';
  if (!isActor) {
    if (isViewerAdmin) {
      actorLabel = actorUsername ? `${actorUsername} (${roleName})` : roleName;
    } else {
      actorLabel = roleName;
    }
  }

  let title = 'Account Activity';
  let description = 'An activity was recorded on your account.';
  let category = 'General';
  let isSecuritySensitive = false;
  let deviceInfo = null;

  switch (log.action) {
    case 'LOGIN_RATE_LIMITED': {
      category = 'Security';
      isSecuritySensitive = true;
      title = 'Login Spam Lockout';
      const ipPart = details.ip ? ` from IP ${details.ip}` : '';
      const dur = details.lockoutDurationSeconds ? `${Math.round(details.lockoutDurationSeconds / 60)} minutes` : '2 minutes';
      description = `Login was temporarily locked for ${dur}${ipPart} due to excessive failed attempts.`;
      break;
    }
    case 'TRANSACTION_RATE_LIMITED': {
      category = 'Security';
      isSecuritySensitive = true;
      title = 'Transaction Rate Limited';
      const tx = details.transaction ? String(details.transaction).replace(/_/g, ' ').toLowerCase() : 'transaction';
      const ipPart = details.ip ? ` from IP ${details.ip}` : '';
      const dur = details.retryAfterSeconds ? `${details.retryAfterSeconds} seconds` : 'cooldown period';
      description = isActor
        ? `You exceeded the allowed rate for ${tx}. Requests are paused for ${dur}.`
        : `Rate limit triggered for ${tx}${ipPart}. Paused for ${dur} to protect system integrity.`;
      break;
    }
    case 'USER_LOGIN': {
      category = 'Security';
      isSecuritySensitive = true;
      title = 'Sign In';
      const devSummary = details.summary || (details.browser && details.os ? `${details.browser} on ${details.os}` : '');
      const ipPart = details.ip ? ` (${details.ip})` : '';
      const method = details.method === 'google' ? ' via Google authentication' : '';

      if (isActor) {
        description = devSummary
          ? `You signed in to your SAPES account from ${devSummary}${ipPart}${method}.`
          : `You signed in to your SAPES account${method}.`;
      } else if (isViewerAdmin) {
        description = devSummary
          ? `${actorLabel} signed in to SAPES from ${devSummary}${ipPart}${method}.`
          : `${actorLabel} signed in to SAPES${method}.`;
      } else {
        description = `${actorLabel} signed in to your account${devSummary ? ` from ${devSummary}` : ''}.`;
      }

      if (details.browser || details.os || details.ip || details.summary) {
        deviceInfo = {
          browser: details.browser || '',
          os: details.os || '',
          ip: details.ip || '',
          summary: details.summary || devSummary || 'Web browser'
        };
      }
      break;
    }

    case 'USER_LOGOUT': {
      category = 'Security';
      title = 'Sign Out';
      const devSummary = details.summary || (details.browser && details.os ? `${details.browser} on ${details.os}` : '');
      const ipPart = details.ip ? ` (${details.ip})` : '';

      if (isActor) {
        description = devSummary
          ? `You signed out of your SAPES account from ${devSummary}${ipPart}.`
          : 'You signed out of your SAPES account.';
      } else if (isViewerAdmin) {
        description = devSummary
          ? `${actorLabel} signed out of SAPES from ${devSummary}${ipPart}.`
          : `${actorLabel} signed out of SAPES.`;
      } else {
        description = `${actorLabel} signed out of your account.`;
      }

      if (details.browser || details.os || details.ip || details.summary) {
        deviceInfo = {
          browser: details.browser || '',
          os: details.os || '',
          ip: details.ip || '',
          summary: details.summary || devSummary || 'Web browser'
        };
      }
      break;
    }

    case 'PASSWORD_CHANGED': {
      category = 'Security';
      isSecuritySensitive = true;
      title = 'Password Changed';
      description = isActor
        ? 'Your account password was changed.'
        : (isViewerAdmin ? `${actorLabel} changed their account password.` : 'Your account password was changed by an administrator.');
      break;
    }

    case 'PASSWORD_RESET': {
      category = 'Security';
      isSecuritySensitive = true;
      title = 'Password Reset';
      description = isActor
        ? 'Your account password was successfully reset using email verification.'
        : (isViewerAdmin ? `${actorLabel} reset account password using email verification.` : 'Your account password was reset.');
      break;
    }

    case 'STUDENT_PROFILE_UPDATED': {
      category = 'Profile';
      title = 'Profile Updated';
      if (isActor) {
        if (details.isTransferee || details.studentType === 'transferee') {
          title = 'Classification Updated';
          description = 'You identified yourself as a transferee.';
        } else if (details.isShifter || details.studentType === 'shifter') {
          title = 'Classification Updated';
          description = 'You identified yourself as a shifter.';
        } else if (details.hasContactUpdate) {
          title = 'Contact Information Updated';
          description = 'You updated your contact information.';
        } else if (Array.isArray(details.updatedSections) && details.updatedSections.length > 0) {
          const names = details.updatedSections
            .map((sec) => SECTION_LABELS[sec] || String(sec).replace(/([A-Z])/g, ' $1').toLowerCase())
            .join(', ');
          description = `You updated your ${names}.`;
        } else {
          description = 'You updated your student profile information.';
        }
      } else if (isViewerAdmin) {
        const studentRef = details.institutionId || actorUsername || 'student';
        description = `${actorLabel} updated student profile information for Student ${studentRef}.`;
      } else {
        description = `${actorLabel} updated your student profile information.`;
      }
      break;
    }

    case 'UPDATE_STUDENT_CLASSIFICATION': {
      category = 'Profile';
      title = 'Classification Updated';
      if (isActor) {
        description = details.institutionId
          ? `You updated classification for Student ${details.institutionId}.`
          : 'You updated student classification.';
      } else if (isViewerAdmin) {
        description = details.institutionId
          ? `${actorLabel} updated classification for Student ${details.institutionId}.`
          : `${actorLabel} updated student classification.`;
      } else {
        description = `Your student classification was updated by ${actorLabel.toLowerCase()}.`;
      }
      break;
    }

    case 'UPDATE_STUDENT_STATUS': {
      category = 'Academic';
      isSecuritySensitive = true;
      title = isActor ? 'Academic Status Updated' : 'Academic Status Changed';
      const statusRaw = details.status ? String(details.status) : '';
      const formattedStatus = statusRaw ? statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1).toLowerCase() : '';
      const previousRaw = details.previousStatus ? String(details.previousStatus) : '';
      const formattedPrevious = previousRaw ? previousRaw.charAt(0).toUpperCase() + previousRaw.slice(1).toLowerCase() : '';
      const reasonPart = details.reason ? ` (${details.reason})` : '';

      if (isActor) {
        const studentRef = details.institutionId ? ` for Student ${details.institutionId}` : '';
        description = `You updated student academic status to ${formattedStatus || 'a new status'}${studentRef}${reasonPart}.`;
      } else if (isViewerAdmin) {
        const studentRef = details.institutionId ? ` for Student ${details.institutionId}` : '';
        description = `${actorLabel} updated academic status${studentRef} to ${formattedStatus || 'updated'}${reasonPart}.`;
      } else {
        if (formattedPrevious && formattedStatus && formattedPrevious.toLowerCase() !== formattedStatus.toLowerCase()) {
          description = `Your academic status was changed from ${formattedPrevious} to ${formattedStatus}${reasonPart}.`;
        } else if (formattedStatus) {
          description = `Your academic status was changed to ${formattedStatus}${reasonPart}.`;
        } else {
          description = `Your academic status was updated by an ${actorLabel.toLowerCase()}.`;
        }
      }
      break;
    }

    case 'COURSE_EVALUATION_UPDATED':
    case 'UPDATE_FACULTY_EVALUATION': {
      category = isViewerAdmin ? 'Faculty Evaluation' : 'Academic';
      title = isActor ? 'Evaluation Submitted' : 'Course Evaluation Updated';
      if (isActor) {
        description = details.institutionId
          ? `You submitted an evaluation for Student ${details.institutionId}.`
          : 'You submitted a student course evaluation.';
      } else if (isViewerAdmin) {
        description = details.institutionId
          ? `${actorLabel} submitted course evaluation for Student ${details.institutionId}.`
          : `${actorLabel} submitted a student course evaluation.`;
      } else {
        description = 'A faculty member updated your course evaluation.';
      }
      break;
    }

    case 'STUDENT_ENROLLMENT_APPROVED': {
      category = 'Enrollment';
      title = 'Enrollment Approved';
      if (isActor) {
        description = details.institutionId
          ? `You approved enrollment for Student ${details.institutionId}.`
          : 'You approved student enrollment.';
      } else if (isViewerAdmin) {
        description = details.institutionId
          ? `${actorLabel} approved enrollment for Student ${details.institutionId}.`
          : `${actorLabel} approved student enrollment.`;
      } else {
        description = 'Your enrollment status was approved by the department enrollment officer.';
      }
      break;
    }

    case 'USER_STATUS_UPDATED':
    case 'ACCOUNT_STATUS_UPDATED': {
      category = 'User Management';
      isSecuritySensitive = true;
      title = 'Account Status Changed';
      const statusName = details.accountStatus
        ? String(details.accountStatus).charAt(0).toUpperCase() + String(details.accountStatus).slice(1).toLowerCase()
        : '';
      const username = details.username || '';
      if (isActor) {
        description = `You updated account status${username ? ` for ${username}` : ''} to ${statusName || 'updated status'}.`;
      } else if (isViewerAdmin) {
        description = username
          ? `${actorLabel} updated account status for ${username} to ${statusName || 'updated'}.`
          : `${actorLabel} updated user account status.`;
      } else {
        description = statusName
          ? `Your account status was set to ${statusName} by an administrator.`
          : 'An administrator updated your account status.';
      }
      break;
    }

    case 'USER_UPDATED': {
      category = 'User Management';
      title = 'Account Updated';
      const username = details.username || '';
      if (isActor) {
        description = `You updated account details${username ? ` for ${username}` : ''}.`;
      } else if (isViewerAdmin) {
        description = username
          ? `${actorLabel} updated account details for ${username}.`
          : `${actorLabel} updated user account details.`;
      } else {
        description = 'An administrator updated your account information.';
      }
      break;
    }

    case 'USER_CREATED': {
      category = 'User Management';
      title = 'Account Provisioned';
      const username = details.username || '';
      const role = details.role || '';
      if (isActor) {
        description = username
          ? `You created account for ${username}${role ? ` (${role})` : ''}.`
          : 'You provisioned a user account.';
      } else if (isViewerAdmin) {
        description = username
          ? `${actorLabel} provisioned account for ${username}${role ? ` (${role})` : ''}.`
          : `${actorLabel} created a user account.`;
      } else {
        description = 'Your account was created in SAPES.';
      }
      break;
    }

    case 'ACADEMIC_RECORD_SAVED': {
      category = 'Academic';
      title = 'Academic Record Updated';
      const studentId = details.institutionId || details.studentId || '';
      if (isActor) {
        description = studentId
          ? `You updated academic records for Student ${studentId}.`
          : 'You updated academic records.';
      } else if (isViewerAdmin) {
        description = studentId
          ? `${actorLabel} updated academic records for Student ${studentId}.`
          : `${actorLabel} updated student academic records.`;
      } else {
        description = 'Your academic records were updated in the system.';
      }
      break;
    }

    case 'EXPORT_STUDENT_REPORTS': {
      category = 'Academic';
      title = 'Report Exported';
      const formatStr = details.format ? String(details.format).toUpperCase() : 'STANDARD';
      const recordStr = details.recordCount !== undefined ? ` (${details.recordCount} records)` : '';
      const repName = details.reportName || 'Overall Enrolled Students Report';
      const ayStr = details.filters?.academicYear ? ` for Academic Year ${details.filters.academicYear}` : '';
      description = isActor
        ? `You exported ${repName}${ayStr} in ${formatStr} format${recordStr}.`
        : `An enrolled-student report${ayStr} was exported as ${formatStr} by an administrator.`;
      break;
    }

    case 'EXPORT_STUDENT_REPORTS_FAILED': {
      category = 'Academic';
      title = 'Report Export Failed';
      const formatStr = details.format ? String(details.format).toUpperCase() : 'STANDARD';
      const repName = details.reportName || 'Overall Enrolled Students Report';
      description = isActor
        ? `Failed to generate ${repName} in ${formatStr} format.`
        : `An export of ${repName} in ${formatStr} format failed.`;
      break;
    }

    case 'REPORT_MODIFIED': {
      category = 'Academic';
      title = 'Report Modified';
      const repName = details.reportName || 'Overall Enrolled Students Report';
      description = isActor
        ? `You modified ${repName} configuration.`
        : `An administrator modified ${repName} configuration.`;
      break;
    }

    case 'ROLE_PERMISSIONS_UPDATED': {
      category = 'User Management';
      title = 'Role Permissions Updated';
      description = details.role
        ? `Administrator updated permissions for ${details.role} role.`
        : 'Administrator updated role permissions.';
      break;
    }

    case 'SYSTEM_SETTINGS_UPDATED': {
      category = 'System';
      title = 'System Settings Updated';
      description = 'Administrator updated system configuration settings.';
      break;
    }

    case 'INTEGRATION_CREDENTIAL_CUSTOMIZED': {
      category = 'System';
      title = 'API Credentials Customized';
      description = details.integration
        ? `Administrator customized API credentials for ${details.integration}.`
        : 'Administrator customized external API credentials.';
      break;
    }

    case 'INTEGRATION_CREDENTIAL_RESET': {
      category = 'System';
      title = 'API Credentials Reset';
      description = details.integration
        ? `Administrator reset API credentials for ${details.integration} to default (.env).`
        : 'Administrator reset external API credentials to default.';
      break;
    }

    case 'ACADEMIC_PERIOD_SAVED': {
      category = 'Academic';
      title = 'Academic Period Updated';
      description = details.schoolYear
        ? `Administrator updated academic period to AY ${details.schoolYear} ${details.semester || ''}.`
        : 'Administrator updated academic term policy.';
      break;
    }

    case 'RECORD_LOCKED': {
      category = 'Academic';
      title = 'Record Locked';
      const studentRef = details.resourceId ? `Student ${details.resourceId}` : 'student record';
      const mode = details.lockMode === 'EXCLUSIVE' ? 'exclusive' : 'shared';
      description = isActor
        ? `You acquired an ${mode} lock on ${studentRef} (${details.leaseSeconds || 120}s lease).`
        : `${actorLabel} acquired an ${mode} lock on ${studentRef}.`;
      break;
    }

    case 'RECORD_UNLOCKED': {
      category = 'Academic';
      title = 'Record Unlocked';
      const studentRef = details.resourceId ? `Student ${details.resourceId}` : 'student record';
      description = isActor
        ? `You released the lock on ${studentRef}.`
        : `Lock on ${studentRef} was released by ${actorLabel}.`;
      break;
    }

    case 'LOCK_CONFLICT': {
      category = isViewerAdmin ? 'Security' : 'Academic';
      title = 'Lock Conflict';
      const studentRef = details.resourceId ? `Student ${details.resourceId}` : 'student record';
      const heldBy = details.heldBy || 'another user';
      description = isActor
        ? `Lock request on ${studentRef} was denied because it is currently locked by ${heldBy}.`
        : `Concurrent edit conflict on ${studentRef}: lock held by ${heldBy}.`;
      break;
    }

    default: {
      title = log.action
        ? log.action.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Account Activity';
      description = isActor
        ? `You performed: ${title}.`
        : `An action was recorded by ${actorLabel}.`;
      break;
    }
  }

  return {
    title,
    description,
    category,
    actor: actorLabel,
    isSecuritySensitive,
    deviceInfo
  };
}

router.get(
  '/mine',
  authenticateToken,
  authorizeRoles('student', 'faculty'),
  async (req, res) => {
    try {
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 20);
      const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';

      if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
        return res.status(400).json({
          success: false,
          message: `page must be a positive integer and limit must be an integer from 1 to ${MAX_LIMIT}`
        });
      }

      let studentInstitutionId = null;
      if (req.user.role === 'student') {
        try {
          const student = await Student.findById(req.user.userId, { institutionId: 1 }).lean();
          if (student?.institutionId) {
            studentInstitutionId = student.institutionId;
          }
        } catch {
          studentInstitutionId = null;
        }
      }

      const orConditions = [
        { userId: req.user.userId },
        { targetId: req.user.userId },
        { 'details.studentId': req.user.userId }
      ];
      if (studentInstitutionId) {
        orConditions.push({ 'details.institutionId': studentInstitutionId });
      }

      const filter = { $or: orConditions };

      if (category && category.toUpperCase() !== 'ALL') {
        const catKey = category.toUpperCase();
        if (USER_ACTIVITY_CATEGORIES[catKey]) {
          filter.action = { $in: USER_ACTIVITY_CATEGORIES[catKey] };
        }
      }

      const [total, auditLogs] = await Promise.all([
        AuditLog.countDocuments(filter),
        AuditLog.find(
          filter,
          {
            _id: 1,
            userId: 1,
            userRole: 1,
            userModel: 1,
            action: 1,
            targetType: 1,
            targetId: 1,
            timestamp: 1,
            details: 1
          }
        )
          .sort({ timestamp: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()
      ]);

      return res.json({
        success: true,
        data: {
          auditLogs: auditLogs.map((auditLog) => {
            const human = formatHumanReadableActivity(auditLog, req.user);
            return {
              _id: auditLog._id,
              userId: auditLog.userId,
              userRole: auditLog.userRole,
              userModel: auditLog.userModel,
              action: auditLog.action,
              targetType: auditLog.targetType,
              targetId: auditLog.targetId,
              timestamp: auditLog.timestamp,
              title: human.title,
              description: human.description,
              category: human.category,
              actor: human.actor,
              isSecuritySensitive: human.isSecuritySensitive,
              deviceInfo: human.deviceInfo,
              details: sanitizeDetails(auditLog.details)
            };
          }),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching account activity logs:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  authorizePermission('view_audit_logs'),
  async (req, res) => {
    try {
      const {
        action,
        targetType,
        userId,
        category,
        search,
        page: pageParam = '1',
        limit: limitParam = '20'
      } = req.query;

      const page = Number(pageParam);
      const limit = Number(limitParam);

      if (
        !Number.isInteger(page) ||
        page < 1 ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > MAX_LIMIT
      ) {
        return res.status(400).json({
          success: false,
          message: `page must be a positive integer and limit must be an integer from 1 to ${MAX_LIMIT}`
        });
      }

      const filter = {};

      if (action !== undefined) {
        if (typeof action !== 'string' || !action.trim()) {
          return res.status(400).json({
            success: false,
            message: 'action must be a non-empty string'
          });
        }
        filter.action = action.trim();
      }

      if (targetType !== undefined) {
        if (typeof targetType !== 'string' || !targetType.trim()) {
          return res.status(400).json({
            success: false,
            message: 'targetType must be a non-empty string'
          });
        }
        filter.targetType = targetType.trim();
      }

      if (userId !== undefined) {
        if (typeof userId !== 'string' || !mongoose.isValidObjectId(userId)) {
          return res.status(400).json({
            success: false,
            message: 'userId must be a valid user ID'
          });
        }
        filter.userId = userId;
      }

      if (category !== undefined && typeof category === 'string' && category.trim()) {
        const catKey = category.trim().toUpperCase();
        if (catKey !== 'ALL') {
          if (CATEGORY_ACTIONS[catKey]) {
            filter.action = { $in: CATEGORY_ACTIONS[catKey] };
          } else if (catKey === 'SYSTEM') {
            const knownActions = Object.values(CATEGORY_ACTIONS).flat();
            filter.action = { $nin: knownActions };
          }
        }
      }

      if (search !== undefined && typeof search === 'string' && search.trim()) {
        const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(safeSearch, 'i');
        filter.$or = [
          { action: searchRegex },
          { targetType: searchRegex },
          { userRole: searchRegex },
          { 'details.username': searchRegex },
          { 'details.institutionId': searchRegex },
          { 'details.studentId': searchRegex },
          { 'details.reportName': searchRegex }
        ];
      }

      const [total, auditLogs] = await Promise.all([
        AuditLog.countDocuments(filter),
        AuditLog.find(
          filter,
          {
            _id: 1,
            userId: 1,
            userRole: 1,
            userModel: 1,
            action: 1,
            targetType: 1,
            targetId: 1,
            timestamp: 1,
            details: 1
          }
        )
          .populate({
            path: 'userId',
            select: '-_id username role'
          })
          .sort({ timestamp: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()
      ]);

      res.json({
        success: true,
        data: {
          auditLogs: auditLogs.map((auditLog) => {
            const human = formatHumanReadableActivity(auditLog, req.user);
            return {
              ...auditLog,
              title: human.title,
              description: human.description,
              category: human.category,
              actor: human.actor,
              details: sanitizeDetails(auditLog.details)
            };
          }),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);

      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

module.exports = router;
