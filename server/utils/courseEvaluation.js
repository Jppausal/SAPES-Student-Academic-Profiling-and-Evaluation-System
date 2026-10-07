const normalizeText = (value, field, maxLength, required = false) => {
  if (typeof value !== 'string') {
    return required ? { error: `${field} is required` } : { value: '' };
  }
  const normalized = value.trim();
  if (required && !normalized) return { error: `${field} is required` };
  if (normalized.length > maxLength) return { error: `${field} is too long` };
  return { value: normalized };
};

const normalizeDate = (value, field, required = false) => {
  if (value === undefined || value === null || value === '') {
    return required ? { error: `${field} is required` } : { value: undefined };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { error: `${field} must be a valid date` };
  return { value: date };
};

const validateCourseEvaluation = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be an object' };
  }

  const allowedFields = [
    'academicYear', 'semester', 'assessments', 'attendanceLogs',
    'rubricScores', 'facultyRemarks', 'internalNotes'
  ];
  const unsupportedField = Object.keys(body).find((field) => !allowedFields.includes(field));
  if (unsupportedField) return { error: `${unsupportedField} is not supported` };

  const academicYear = normalizeText(body.academicYear || '2026-2027', 'academicYear', 30, true);
  if (academicYear.error) return academicYear;
  const semester = normalizeText(body.semester || '1st Semester', 'semester', 30, true);
  if (semester.error) return semester;

  const listFields = ['assessments', 'attendanceLogs', 'rubricScores', 'facultyRemarks'];
  for (const field of listFields) {
    if (body[field] !== undefined && !Array.isArray(body[field])) {
      return { error: `${field} must be an array` };
    }
    if ((body[field] || []).length > 200) {
      return { error: `${field} cannot contain more than 200 entries` };
    }
  }

  const assessments = [];
  for (const [index, item] of (body.assessments || []).entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { error: `assessments[${index}] must be an object` };
    }
    const title = normalizeText(item.title, `assessments[${index}].title`, 160, true);
    if (title.error) return title;
    if (!['quiz', 'lab', 'exam', 'other'].includes(item.category)) {
      return { error: `assessments[${index}].category is invalid` };
    }
    if (!Number.isFinite(item.score) || item.score < 0) {
      return { error: `assessments[${index}].score must be a non-negative number` };
    }
    if (!Number.isFinite(item.possiblePoints) || item.possiblePoints <= 0 || item.score > item.possiblePoints) {
      return { error: `assessments[${index}].possiblePoints must be positive and at least the score` };
    }
    if (item.submitted !== undefined && typeof item.submitted !== 'boolean') {
      return { error: `assessments[${index}].submitted must be a boolean` };
    }
    const dueDate = normalizeDate(item.dueDate, `assessments[${index}].dueDate`);
    if (dueDate.error) return dueDate;
    assessments.push({
      title: title.value,
      category: item.category,
      score: item.score,
      possiblePoints: item.possiblePoints,
      submitted: item.submitted !== false,
      dueDate: dueDate.value
    });
  }

  const attendanceLogs = [];
  for (const [index, item] of (body.attendanceLogs || []).entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { error: `attendanceLogs[${index}] must be an object` };
    }
    const date = normalizeDate(item.date, `attendanceLogs[${index}].date`, true);
    if (date.error) return date;
    if (!['present', 'late', 'absent', 'excused'].includes(item.status)) {
      return { error: `attendanceLogs[${index}].status is invalid` };
    }
    const notes = normalizeText(item.notes || '', `attendanceLogs[${index}].notes`, 500);
    if (notes.error) return notes;
    const excuseLetter = normalizeText(item.excuseLetter || '', `attendanceLogs[${index}].excuseLetter`, 200);
    if (excuseLetter.error) return excuseLetter;
    attendanceLogs.push({ date: date.value, status: item.status, notes: notes.value, excuseLetter: excuseLetter.value });
  }

  const rubricScores = [];
  for (const [index, item] of (body.rubricScores || []).entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { error: `rubricScores[${index}] must be an object` };
    }
    const competency = normalizeText(item.competency, `rubricScores[${index}].competency`, 160, true);
    if (competency.error) return competency;
    const maxRating = item.maxRating === undefined ? 5 : item.maxRating;
    if (!Number.isFinite(maxRating) || maxRating < 1 || maxRating > 5 || !Number.isFinite(item.rating) || item.rating < 0 || item.rating > maxRating) {
      return { error: `rubricScores[${index}].rating must be between 0 and maxRating` };
    }
    const notes = normalizeText(item.notes || '', `rubricScores[${index}].notes`, 1000);
    if (notes.error) return notes;
    rubricScores.push({ competency: competency.value, rating: item.rating, maxRating, notes: notes.value });
  }

  const facultyRemarks = [];
  for (const [index, item] of (body.facultyRemarks || []).entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { error: `facultyRemarks[${index}] must be an object` };
    }
    const text = normalizeText(item.text, `facultyRemarks[${index}].text`, 2000, true);
    if (text.error) return text;
    const createdAt = normalizeDate(item.createdAt, `facultyRemarks[${index}].createdAt`);
    if (createdAt.error) return createdAt;
    facultyRemarks.push({ text: text.value, createdAt: createdAt.value || new Date() });
  }

  const internalNotes = normalizeText(body.internalNotes || '', 'internalNotes', 5000);
  if (internalNotes.error) return internalNotes;

  return {
    value: {
      academicYear: academicYear.value,
      semester: semester.value,
      assessments,
      attendanceLogs,
      rubricScores,
      facultyRemarks,
      internalNotes: internalNotes.value
    }
  };
};

const calculateCourseMetrics = (evaluation = {}, peerGrades = []) => {
  const assessments = evaluation.assessments || [];
  const gradedAssessments = assessments.filter((assessment) => assessment.submitted !== false);
  const possiblePoints = gradedAssessments.reduce((total, assessment) => total + assessment.possiblePoints, 0);
  const score = gradedAssessments.reduce((total, assessment) => total + assessment.score, 0);
  const attendanceEntries = (evaluation.attendanceLogs || []).filter((entry) => entry.status !== 'excused');
  const attended = attendanceEntries.filter((entry) => entry.status === 'present' || entry.status === 'late').length;

  const runningGrade = possiblePoints > 0 ? Number((score / possiblePoints * 100).toFixed(1)) : null;
  const submissionRate = assessments.length > 0
    ? Number((assessments.filter((assessment) => assessment.submitted !== false).length / assessments.length * 100).toFixed(1))
    : null;
  const attendanceRate = attendanceEntries.length > 0
    ? Number((attended / attendanceEntries.length * 100).toFixed(1))
    : null;
  const validPeerGrades = peerGrades.filter(Number.isFinite);
  const classPercentile = runningGrade !== null && validPeerGrades.length > 0
    ? Math.round(validPeerGrades.filter((grade) => grade <= runningGrade).length / validPeerGrades.length * 100)
    : null;

  return { attendanceRate, classPercentile, runningGrade, submissionRate };
};

module.exports = { validateCourseEvaluation, calculateCourseMetrics };