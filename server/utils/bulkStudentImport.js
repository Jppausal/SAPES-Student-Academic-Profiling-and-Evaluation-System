const Student = require('../models/Student');
const AcademicRecord = require('../models/AcademicRecord');
const { validateAndNormalizeAcademicRecord } = require('./academicRecord');

function parseBoolean(val) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'true' || s === 'yes' || s === 'y' || s === '1';
  }
  return false;
}

function normalizeImportRow(raw, index) {
  const rowNumber = index + 1;
  const errors = [];

  const institutionId = String(raw.institutionId || raw.studentId || raw['Student ID'] || raw['ID Number'] || '').trim();
  const firstName = String(raw.firstName || raw['First Name'] || '').trim();
  const lastName = String(raw.lastName || raw['Last Name'] || '').trim();
  const middleName = String(raw.middleName || raw['Middle Name'] || '').trim();
  const email = String(raw.email || raw.institutionalEmail || raw['Institutional Email'] || raw['Email'] || '').trim().toLowerCase();
  const program = String(raw.program || raw.course || raw['Program'] || raw['Course'] || 'Bachelor of Information Technology').trim();
  const yearLevel = Number(raw.yearLevel || raw['Year Level'] || raw['Year'] || 1);
  const section = String(raw.section || raw['Section'] || '').trim();
  const studentType = String(raw.studentType || raw['Student Type'] || 'Regular').trim();
  const religion = String(raw.religion || raw['Religion'] || '').trim();
  const currentStatus = String(raw.academicStatus || raw.status || raw['Academic Status'] || 'Regular').trim();

  const isIP = parseBoolean(raw.isIP || raw['Is IP'] || raw['IP']);
  const isPWD = parseBoolean(raw.isPWD || raw['Is PWD'] || raw['PWD']);
  const isShifter = parseBoolean(raw.isShifter || raw['Is Shifter'] || raw['Shifter']);
  const isTransferee = parseBoolean(raw.isTransferee || raw['Is Transferee'] || raw['Transferee']);
  const isOnProbation = parseBoolean(raw.isOnProbation || raw['On Probation']) || currentStatus.toLowerCase().includes('probation');

  if (!institutionId) {
    errors.push('Student ID / institutionId is required');
  }
  if (!firstName) {
    errors.push('First Name is required');
  }
  if (!lastName) {
    errors.push('Last Name is required');
  }
  if (yearLevel && (yearLevel < 1 || yearLevel > 6)) {
    errors.push('Year level must be between 1 and 6');
  }

  // Optional academic record subjects
  let academicRecord = null;
  const academicYear = String(raw.academicYear || raw['Academic Year'] || '').trim();
  const semester = String(raw.semester || raw['Semester'] || '').trim();
  const subjectsRaw = raw.subjects;

  if (academicYear && semester && Array.isArray(subjectsRaw) && subjectsRaw.length > 0) {
    const validated = validateAndNormalizeAcademicRecord({
      academicYear,
      semester,
      subjects: subjectsRaw
    });
    if (validated.error) {
      errors.push(`Academic record error: ${validated.error}`);
    } else {
      academicRecord = validated.value;
    }
  }

  return {
    rowNumber,
    institutionId,
    isValid: errors.length === 0,
    errors,
    data: {
      institutionId,
      firstName,
      lastName,
      middleName,
      email,
      program,
      yearLevel: isNaN(yearLevel) ? 1 : yearLevel,
      section,
      studentType,
      religion,
      isIP,
      isPWD,
      isShifter,
      isTransferee,
      academicStatus: {
        currentStatus,
        isOnProbation
      },
      academicRecord
    }
  };
}

async function processBulkStudentImport(rows, adminUserId) {
  const results = {
    totalRows: rows.length,
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    errors: []
  };

  const seenIdsInBatch = new Set();

  for (let i = 0; i < rows.length; i++) {
    const normalized = normalizeImportRow(rows[i], i);
    if (!normalized.isValid) {
      results.skippedCount++;
      results.errors.push({
        row: normalized.rowNumber,
        institutionId: normalized.institutionId || 'N/A',
        error: normalized.errors.join('; ')
      });
      continue;
    }

    const { institutionId, data } = normalized;
    if (seenIdsInBatch.has(institutionId)) {
      results.skippedCount++;
      results.errors.push({
        row: normalized.rowNumber,
        institutionId,
        error: 'Duplicate student ID within the uploaded batch file'
      });
      continue;
    }
    seenIdsInBatch.add(institutionId);

    try {
      let student = await Student.findOne({ institutionId });
      let isNew = false;

      if (!student) {
        isNew = true;
        student = new Student({
          institutionId,
          role: 'student',
          accountStatus: 'active',
          enrollmentStatus: 'enrolled',
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          yearLevel: data.yearLevel,
          section: data.section,
          personalInformation: {
            firstName: data.firstName,
            lastName: data.lastName,
            middleName: data.middleName
          },
          enrollmentInformation: {
            course: data.program,
            yearLevel: String(data.yearLevel),
            studentType: data.studentType
          },
          classification: {
            program: data.program,
            studentType: data.studentType,
            isIP: data.isIP,
            isPWD: data.isPWD,
            isShifter: data.isShifter,
            isTransferee: data.isTransferee
          },
          religiousInformation: {
            religion: data.religion
          },
          academicStatus: {
            currentStatus: data.academicStatus.currentStatus,
            isOnProbation: data.academicStatus.isOnProbation
          }
        });
        await student.save();
        results.createdCount++;
      } else {
        // Update non-destructive profile & academic fields
        student.firstName = data.firstName;
        student.lastName = data.lastName;
        if (data.email) student.email = data.email;
        if (data.yearLevel) student.yearLevel = data.yearLevel;
        if (data.section) student.section = data.section;

        student.personalInformation = student.personalInformation || {};
        student.personalInformation.firstName = data.firstName;
        student.personalInformation.lastName = data.lastName;
        if (data.middleName) student.personalInformation.middleName = data.middleName;

        student.enrollmentInformation = student.enrollmentInformation || {};
        student.enrollmentInformation.course = data.program;
        student.enrollmentInformation.yearLevel = String(data.yearLevel);
        student.enrollmentInformation.studentType = data.studentType;

        student.classification = student.classification || {};
        student.classification.program = data.program;
        student.classification.studentType = data.studentType;
        student.classification.isIP = data.isIP;
        student.classification.isPWD = data.isPWD;
        student.classification.isShifter = data.isShifter;
        student.classification.isTransferee = data.isTransferee;

        if (data.religion) {
          student.religiousInformation = student.religiousInformation || {};
          student.religiousInformation.religion = data.religion;
        }

        student.academicStatus = student.academicStatus || {};
        student.academicStatus.currentStatus = data.academicStatus.currentStatus;
        student.academicStatus.isOnProbation = data.academicStatus.isOnProbation;

        await student.save();
        results.updatedCount++;
      }

      // If academic record was supplied with subjects
      if (data.academicRecord && student._id) {
        await AcademicRecord.findOneAndUpdate(
          {
            studentId: student._id,
            academicYear: data.academicRecord.academicYear,
            semester: data.academicRecord.semester
          },
          {
            $set: {
              subjects: data.academicRecord.subjects,
              isDemo: false
            }
          },
          {
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true
          }
        );
      }
    } catch (dbError) {
      results.skippedCount++;
      results.errors.push({
        row: normalized.rowNumber,
        institutionId,
        error: dbError instanceof Error ? dbError.message : 'Database error while saving student'
      });
    }
  }

  return results;
}

module.exports = {
  normalizeImportRow,
  processBulkStudentImport
};
