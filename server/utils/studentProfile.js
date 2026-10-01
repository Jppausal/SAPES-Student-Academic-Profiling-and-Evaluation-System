const PROFILE_SECTION_RULES = {
  personalInformation: {
    strings: ['firstName', 'middleName', 'lastName', 'birthPlace', 'sex', 'civilStatus', 'nationality', 'citizenship'],
    booleans: ['isForeigner'],
    dates: ['birthDate']
  },
  classification: {
    strings: ['program', 'studentType', 'indigenousGroup'],
    booleans: ['isIP', 'isPWD', 'isShifter', 'isTransferee'],
    dates: []
  },
  religiousInformation: {
    strings: ['religion'],
    booleans: [],
    dates: []
  }
};

const TECHNOLOGY_PROGRAMS = [
  'Bachelor of Information Technology',
  'Entertainment and Multimedia Computing',
  'Electronics',
  'Food Technology',
  'Automotive Technology'
];

const validateAndNormalizeStudentProfile = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be an object' };
  }

  const allowedSections = Object.keys(PROFILE_SECTION_RULES);
  const bodySections = Object.keys(body);

  if (bodySections.length === 0) {
    return { error: 'At least one profile section is required' };
  }

  const unsupportedSection = bodySections.find((section) => !allowedSections.includes(section));
  if (unsupportedSection) {
    return { error: `${unsupportedSection} is system-controlled or not editable` };
  }

  const normalized = {};

  for (const sectionName of bodySections) {
    const value = body[sectionName];
    const rules = PROFILE_SECTION_RULES[sectionName];

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { error: `${sectionName} must be an object` };
    }

    const fields = Object.keys(value);
    if (fields.length === 0) {
      return { error: `${sectionName} must include at least one field` };
    }

    const supportedFields = [...rules.strings, ...rules.booleans, ...rules.dates];
    const unsupportedField = fields.find((field) => !supportedFields.includes(field));
    if (unsupportedField) {
      return { error: `${sectionName}.${unsupportedField} is not editable` };
    }

    normalized[sectionName] = {};

    for (const field of rules.strings) {
      if (value[field] === undefined) continue;
      if (typeof value[field] !== 'string') {
        return { error: `${sectionName}.${field} must be a string` };
      }
      if (field === 'program' && value[field] && !TECHNOLOGY_PROGRAMS.includes(value[field])) {
        return { error: 'classification.program must be a College of Technologies program' };
      }
      if (value[field].length > 200) {
        return { error: `${sectionName}.${field} is too long` };
      }
      normalized[sectionName][field] = value[field].trim();
    }

    for (const field of rules.booleans) {
      if (value[field] === undefined) continue;
      if (typeof value[field] !== 'boolean') {
        return { error: `${sectionName}.${field} must be a boolean` };
      }
      normalized[sectionName][field] = value[field];
    }

    for (const field of rules.dates) {
      if (value[field] === undefined) continue;
      const parsedDate = new Date(value[field]);
      if (Number.isNaN(parsedDate.getTime())) {
        return { error: `${sectionName}.${field} must be a valid date` };
      }
      normalized[sectionName][field] = parsedDate;
    }
  }

  return { value: normalized };
};

module.exports = { validateAndNormalizeStudentProfile };
