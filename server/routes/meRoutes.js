const express = require('express');
const Student = require('../models/Student');
const AcademicRecord = require('../models/AcademicRecord');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

const router = express.Router();

router.get(
  '/student',
  authenticateToken,
  authorizeRoles('student'),
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
        data: student
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

router.get(
  '/student/report',
  authenticateToken,
  authorizeRoles('student'),
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
