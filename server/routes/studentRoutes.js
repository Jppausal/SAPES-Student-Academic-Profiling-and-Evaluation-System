const express = require('express');
const Student = require('../models/Student');
const AcademicRecord = require('../models/AcademicRecord');
const FacultyEvaluation = require('../models/FacultyEvaluation');
const StudentStatusHistory = require('../models/StudentStatusHistory');
const AuditLog = require('../models/AuditLog');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

const router = express.Router();

// Create or update the current faculty evaluation for a student
router.put(
  '/:institutionId/evaluation',
  authenticateToken,
  authorizeRoles('faculty'),
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

// Get the evaluation report for a student
router.get(
  '/:institutionId/report',
  authenticateToken,
  authorizeRoles('admin', 'faculty'),
  async (req, res) => {
    try {
      const { institutionId } = req.params;
      const studentRecord = await Student.findOne(
        { institutionId },
        {
          _id: 1,
          institutionId: 1,
          personalInformation: 1,
          classification: 1,
          religiousInformation: 1,
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

      const majorSubjects = academicRecords.flatMap((record) =>
        record.subjects.filter((subject) =>
          subject.isMajor &&
          String(subject.status || '').toLowerCase() !== 'dropped' &&
          typeof subject.grade === 'number' &&
          subject.grade > 0 &&
          subject.units > 0
        )
      );
      const totalMajorUnits = majorSubjects.reduce(
        (sum, subject) => sum + subject.units,
        0
      );
      const majorSubjectGwa = totalMajorUnits === 0
        ? 0
        : Number(
          (
            majorSubjects.reduce(
              (sum, subject) => sum + subject.grade * subject.units,
              0
            ) / totalMajorUnits
          ).toFixed(2)
        );

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

module.exports = router;