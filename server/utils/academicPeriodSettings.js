const mongoose = require('mongoose');
const AcademicPeriodSettings = require('../models/AcademicPeriodSettings');

const DEFAULT_SETTINGS = {
  schoolYear: '2025-2026',
  semester: '1st Semester',
  isTermGradesLocked: false,
  evaluationWindowOpen: true,
  evaluationDeadline: null,
  announcementMessage: ''
};

async function getActiveAcademicPeriod() {
  if (mongoose.connection.readyState !== 1) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const record = await AcademicPeriodSettings.findById('active_period').lean();
    if (!record) {
      return { ...DEFAULT_SETTINGS };
    }
    return {
      schoolYear: record.schoolYear || DEFAULT_SETTINGS.schoolYear,
      semester: record.semester || DEFAULT_SETTINGS.semester,
      isTermGradesLocked: Boolean(record.isTermGradesLocked),
      evaluationWindowOpen: record.evaluationWindowOpen !== false,
      evaluationDeadline: record.evaluationDeadline || null,
      announcementMessage: record.announcementMessage || '',
      updatedAt: record.updatedAt || null
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

module.exports = {
  getActiveAcademicPeriod,
  DEFAULT_SETTINGS
};
