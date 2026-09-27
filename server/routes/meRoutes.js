const express = require('express');
const Student = require('../models/Student');
const User = require('../models/User');
const AcademicRecord = require('../models/AcademicRecord');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { authorizePermission } = require('../middleware/permissionMiddleware');
const { validateAndNormalizeStudentProfile } = require('../utils/studentProfile');
const { calculateMajorSubjectGwa } = require('../utils/academicCalculations');

const router = express.Router();

router.get(
  '/student',
  authenticateToken,
  authorizeRoles('student'),
  authorizePermission('view_own_profile'),
  async (req, res) => {
    try {
      const student = await Student.findOne(
        { userId: req.user.userId },
        {
          _id: 0,
          institutionId: 1,
          personalInformation: 1,
          classification: 1,
          religiousInformation: 1,
          academicStatus: 1
        }
      ).lean();

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found'
        });
      }

      res.json({
        success: true,
        data: {
          ...student,
          classification: student.classification || {},
          religiousInformation: student.religiousInformation || {}
        }
      });
    } catch (error) {
      console.error('Error fetching authenticated student profile:', error);

      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

router.put(
  '/student/profile',
  authenticateToken,
  authorizeRoles('student'),
  authorizePermission('edit_own_profile'),
  async (req, res) => {
    try {
      const body = req.body || {};
      const profileUpdate = validateAndNormalizeStudentProfile(body);
      if (profileUpdate.error) {
        return res.status(400).json({ success: false, message: profileUpdate.error });
      }

      const student = await Student.findOne({ userId: req.user.userId });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student profile not found' });
      }

      for (const sectionName of Object.keys(profileUpdate.value)) {
        if (!student[sectionName]) student[sectionName] = {};
        Object.assign(student[sectionName], profileUpdate.value[sectionName]);
      }

      const firstName = student.personalInformation?.firstName?.trim();
      const lastName = student.personalInformation?.lastName?.trim();
      if (!firstName || !lastName) {
        return res.status(400).json({ success: false, message: 'First name and last name are required' });
      }

      await student.save();
      await User.findByIdAndUpdate(req.user.userId, {
        firstName,
        lastName
      });
      await require('../models/AuditLog').create({
        userId: req.user.userId,
        action: 'STUDENT_PROFILE_UPDATED',
        targetType: 'student_profile',
        targetId: student._id,
        details: { updatedSections: Object.keys(body) }
      });

      return res.json({
        success: true,
        message: 'Student profile updated successfully',
        data: {
          institutionId: student.institutionId,
          personalInformation: student.personalInformation,
          classification: student.classification || {},
          religiousInformation: student.religiousInformation || {},
          academicStatus: student.academicStatus
        }
      });
    } catch (error) {
      console.error('Error updating authenticated student profile:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

router.get(
  '/student/report',
  authenticateToken,
  authorizeRoles('student'),
  authorizePermission('view_own_academic_record'),
  async (req, res) => {
    try {
      const student = await Student.findOne(
        { userId: req.user.userId },
        {
          _id: 1,
          institutionId: 1,
          personalInformation: 1,
          classification: 1,
          religiousInformation: 1,
          academicStatus: 1
        }
      ).lean();

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found'
        });
      }

      const academicRecords = await AcademicRecord.find(
        { studentId: student._id },
        { _id: 0, academicYear: 1, semester: 1, subjects: 1 }
      ).sort({ academicYear: -1, semester: -1 }).lean();

      const majorSubjectGwa = calculateMajorSubjectGwa(academicRecords);

      const { _id, ...safeStudent } = student;
      res.json({
        success: true,
        data: {
          student: safeStudent,
          academicRecords,
          majorSubjectGwa
        }
      });
    } catch (error) {
      console.error('Error fetching authenticated student report:', error);

      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

module.exports = router;
