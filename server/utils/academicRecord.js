const normalizeRequiredString = (value, field, maxLength) => {
  if (typeof value !== 'string' || !value.trim()) {
    return { error: `${field} is required` };
  }
  if (value.length > maxLength) {
    return { error: `${field} is too long` };
  }
  return { value: value.trim() };
};

const validateAndNormalizeAcademicRecord = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be an object' };
  }

  const allowedFields = ['academicYear', 'semester', 'subjects'];
  const unsupportedField = Object.keys(body).find((field) => !allowedFields.includes(field));
  if (unsupportedField) {
    return { error: `${unsupportedField} is not supported` };
  }

  const academicYear = normalizeRequiredString(body.academicYear, 'academicYear', 30);
  if (academicYear.error) return academicYear;

  const semester = normalizeRequiredString(body.semester, 'semester', 30);
  if (semester.error) return semester;

  if (!Array.isArray(body.subjects)) {
    return { error: 'subjects must be an array' };
  }
  if (body.subjects.length > 100) {
    return { error: 'subjects cannot contain more than 100 entries' };
  }

  const subjects = [];
  const subjectCodes = new Set();
  const subjectFields = ['subjectCode', 'subjectName', 'units', 'grade', 'isMajor', 'status'];

  for (const [index, subject] of body.subjects.entries()) {
    const prefix = `subjects[${index}]`;
    if (!subject || typeof subject !== 'object' || Array.isArray(subject)) {
      return { error: `${prefix} must be an object` };
    }

    const unsupportedSubjectField = Object.keys(subject).find(
      (field) => !subjectFields.includes(field)
    );
    if (unsupportedSubjectField) {
      return { error: `${prefix}.${unsupportedSubjectField} is not supported` };
    }

    const subjectCode = normalizeRequiredString(subject.subjectCode, `${prefix}.subjectCode`, 30);
    if (subjectCode.error) return subjectCode;
    const normalizedCode = subjectCode.value.toUpperCase();
    if (subjectCodes.has(normalizedCode)) {
      return { error: `${prefix}.subjectCode must be unique within the record` };
    }
    subjectCodes.add(normalizedCode);

    const subjectName = normalizeRequiredString(subject.subjectName, `${prefix}.subjectName`, 200);
    if (subjectName.error) return subjectName;
    const status = normalizeRequiredString(subject.status, `${prefix}.status`, 50);
    if (status.error) return status;

    if (!Number.isFinite(subject.units) || subject.units <= 0 || subject.units > 30) {
      return { error: `${prefix}.units must be greater than 0 and at most 30` };
    }
    if (!Number.isFinite(subject.grade) || subject.grade < 0 || subject.grade > 5) {
      return { error: `${prefix}.grade must be a number from 0 to 5` };
    }
    if (typeof subject.isMajor !== 'boolean') {
      return { error: `${prefix}.isMajor must be a boolean` };
    }

    subjects.push({
      subjectCode: normalizedCode,
      subjectName: subjectName.value,
      units: subject.units,
      grade: subject.grade,
      isMajor: subject.isMajor,
      status: status.value
    });
  }

  return {
    value: {
      academicYear: academicYear.value,
      semester: semester.value,
      subjects
    }
  };
};

module.exports = { validateAndNormalizeAcademicRecord };
