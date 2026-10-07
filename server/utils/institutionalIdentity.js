const STUDENT_EMAIL_PATTERN = /^([0-9]+)@student\.buksu\.edu\.ph$/i;
const INSTITUTIONAL_EMAIL_PATTERN = /^[^@\s]+@(?:[a-z0-9-]+\.)*buksu\.edu\.ph$/i;

const normalizeInstitutionalEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const extractStudentInstitutionId = (email) => {
  const normalizedEmail = normalizeInstitutionalEmail(email);
  const match = normalizedEmail.match(STUDENT_EMAIL_PATTERN);
  return match ? match[1] : null;
};

const isInstitutionalEmail = (email) =>
  INSTITUTIONAL_EMAIL_PATTERN.test(normalizeInstitutionalEmail(email));

const resolveStudentInstitutionIdentity = ({ email, studentNumber = '' }) => {
  const normalizedEmail = normalizeInstitutionalEmail(email);
  const institutionId = extractStudentInstitutionId(normalizedEmail);

  if (!institutionId) {
    return {
      error: 'Student accounts must use an email in the format studentID@student.buksu.edu.ph'
    };
  }

  const suppliedStudentNumber = typeof studentNumber === 'string'
    ? studentNumber.trim()
    : '';

  if (suppliedStudentNumber && suppliedStudentNumber !== institutionId) {
    return {
      error: 'Student number must match the ID in the institutional email'
    };
  }

  return {
    email: normalizedEmail,
    institutionId,
    username: institutionId
  };
};

module.exports = {
  extractStudentInstitutionId,
  isInstitutionalEmail,
  normalizeInstitutionalEmail,
  resolveStudentInstitutionIdentity
};
