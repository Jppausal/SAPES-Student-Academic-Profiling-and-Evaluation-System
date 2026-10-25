const router = require('express').Router();
const AcademicPeriodSettings = require('../models/AcademicPeriodSettings');
const AuditLog = require('../models/AuditLog');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { authorizeAnyPermission } = require('../middleware/permissionMiddleware');
const { getActiveAcademicPeriod } = require('../utils/academicPeriodSettings');

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// GET /api/academic-periods/active - accessible to all authenticated users
router.get('/active', authenticateToken, async (_req, res) => {
  try {
    const data = await getActiveAcademicPeriod();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Failed to get academic period settings:', error);
    return res.status(500).json({ success: false, message: 'Unable to retrieve academic period settings.' });
  }
});

// PUT /api/academic-periods/active - restricted to admin with permission
router.put(
  '/active',
  authenticateToken,
  authorizeRoles('admin'),
  authorizeAnyPermission('manage_academic_records', 'manage_users'),
  async (req, res) => {
    try {
      const {
        schoolYear,
        semester,
        isTermGradesLocked,
        evaluationWindowOpen,
        evaluationDeadline,
        announcementMessage
      } = req.body || {};

      if (!schoolYear || typeof schoolYear !== 'string' || !schoolYear.trim()) {
        return res.status(400).json({ success: false, message: 'A valid school year is required (e.g., 2025-2026).' });
      }

      const validSemesters = ['1st Semester', '2nd Semester', 'Midyear'];
      if (!semester || !validSemesters.includes(semester)) {
        return res.status(400).json({
          success: false,
          message: `Semester must be one of: ${validSemesters.join(', ')}`
        });
      }

      let parsedDeadline = null;
      if (evaluationDeadline) {
        parsedDeadline = new Date(evaluationDeadline);
        if (Number.isNaN(parsedDeadline.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid evaluation cutoff deadline date.' });
        }
      }

      const before = await AcademicPeriodSettings.findById('active_period').lean();

      const updateData = {
        schoolYear: schoolYear.trim(),
        semester,
        isTermGradesLocked: Boolean(isTermGradesLocked),
        evaluationWindowOpen: Boolean(evaluationWindowOpen),
        evaluationDeadline: parsedDeadline,
        announcementMessage: typeof announcementMessage === 'string' ? announcementMessage.trim() : '',
        updatedBy: req.user.userId
      };

      await AcademicPeriodSettings.findOneAndUpdate(
        { _id: 'active_period' },
        { $set: updateData },
        { upsert: true, new: true, runValidators: true }
      );

      await AuditLog.create({
        userId: req.user.userId,
        userRole: 'admin',
        userModel: 'AdminUser',
        action: 'ACADEMIC_PERIOD_SETTINGS_UPDATED',
        targetType: 'academic_period',
        details: {
          previous: before || {},
          updated: updateData
        }
      });

      const updated = await getActiveAcademicPeriod();
      return res.json({ success: true, data: updated, message: 'Academic period and evaluation window updated successfully.' });
    } catch (error) {
      console.error('Failed to update academic period settings:', error);
      return res.status(500).json({ success: false, message: 'Unable to update academic period settings.' });
    }
  }
);

module.exports = router;
