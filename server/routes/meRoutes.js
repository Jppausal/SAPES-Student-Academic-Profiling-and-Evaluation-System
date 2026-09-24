const express = require('express');
const Student = require('../models/Student');
const AcademicRecord = require('../models/AcademicRecord');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { authorizePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

const editableProfileSections = {
  personalInformation: {
    strings: ['firstName', 'middleName', 'lastName', 'birthDate', 'birthPlace', 'sex', 'civilStatus', 'nationality', 'citizenship'],
    booleans: ['isForeigner']
  },
  classification: {
    strings: ['studentType', 'indigenousGroup'],
    booleans: ['isIP', 'isPWD']
  },
  religiousInformation: {
    strings: ['religion'],
    booleans: []
  }
};

const validateProfileSection = (sectionName, value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return `${sectionName} must be an object`;
  }

  const schema = editableProfileSections[sectionName];
  const supportedFields = [...schema.strings, ...schema.booleans];
  const unsupportedField = Object.keys(value).find((field) => !supportedFields.includes(field));
  if (unsupportedField) {
    return `${sectionName}.${unsupportedField} is not editable`;
  }

  for (const field of schema.strings) {
    if (value[field] !== undefined && typeof value[field] !== 'string') {
      return `${sectionName}.${field} must be a string`;
    }
    if (typeof value[field] === 'string' && value[field].length > 200) {
      return `${sectionName}.${field} is too long`;
    }
  }
  for (const field of schema.booleans) {
    if (value[field] !== undefined && typeof value[field] !== 'boolean') {
      return `${sectionName}.${field} must be a boolean`;
    }
  }

  return null;
};

const normalizeProfileSection = (sectionName, value) => {
  const schema = editableProfileSections[sectionName];
  return Object.fromEntries(Object.entries(value).map(([field, fieldValue]) => [
    field,
    schema.strings.includes(field) && typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue
  ]));
};

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
      const sectionNames = Object.keys(editableProfileSections);
      const unsupportedField = Object.keys(body).find((field) => !sectionNames.includes(field));
      if (unsupportedField) {
        return res.status(400).json({
          success: false,
          message: `${unsupportedField} is system-controlled or not editable`
        });
      }

      for (const sectionName of Object.keys(body)) {
        const validationError = validateProfileSection(sectionName, body[sectionName]);
        if (validationError) {
          return res.status(400).json({ success: false, message: validationError });
        }
      }

      const student = await Student.findOne({ userId: req.user.userId });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student profile not found' });
      }

      for (const sectionName of Object.keys(body)) {
        if (!student[sectionName]) student[sectionName] = {};
        Object.assign(student[sectionName], normalizeProfileSection(sectionName, body[sectionName]));
      }

      const firstName = student.personalInformation?.firstName?.trim();
      const lastName = student.personalInformation?.lastName?.trim();
      if (!firstName || !lastName) {
        return res.status(400).json({ success: false, message: 'First name and last name are required' });
      }

      await student.save();
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

      const majorSubjects = academicRecords.flatMap((record) =>
        record.subjects.filter((subject) =>
          subject.isMajor &&
          String(subject.status || '').toLowerCase() !== 'dropped' &&
          typeof subject.grade === 'number' &&
          subject.grade > 0 &&
          subject.units > 0
        )
      );
      const totalMajorUnits = majorSubjects.reduce((sum, subject) => sum + subject.units, 0);
      const majorSubjectGwa = totalMajorUnits === 0
        ? 0
        : Number(
          (
            majorSubjects.reduce((sum, subject) => sum + subject.grade * subject.units, 0) /
            totalMajorUnits
          ).toFixed(2)
        );

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
