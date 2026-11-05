const HEALTH_CONDITIONS = ['None', 'Anemia', 'Anxiety', 'Asthma', 'Blood Clots', 'Cerebrovascular Accident', 'Depression', 'Hypertension', 'Thyroid Disease', 'Allergies', 'Arthritis', 'Cancer', 'Diabetes', 'Migraine Headaches', 'Peptic Ulcer Disease', 'Seizure Disorder', 'Other'];
const PHYSICAL_ACTIVITY_OPTIONS = ['can_attend_all', 'restricted', 'cannot_attend', 'none', ''];
const ASSISTANCE_NEEDS_OPTIONS = [
  'Wheelchair / Ramp Access',
  'Ground Floor Classroom Placement',
  'Frequent Rest / Medical Breaks',
  'Visual / Hearing Assistance',
  'Emergency Medication Standby',
  'Special Seating Arrangement',
  'Other'
];
const { validateActivities } = require('./scheduleConflicts');

const PROFILE_SECTION_RULES = {
  personalInformation: {
    strings: ['firstName', 'middleName', 'lastName', 'suffix', 'birthPlace', 'sex', 'civilStatus', 'height', 'weight', 'bloodType', 'nationality', 'citizenship', 'dualCitizenship', 'minority'],
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
    booleans: ['shareSpiritualSchedule'],
    dates: []
  },
  enrollmentInformation: {
    strings: ['course', 'level', 'department', 'curriculum', 'yearLevel', 'entryPeriod', 'studentType', 'preferredModality', 'campus', 'learnerReferenceNo', 'nstpNumber'],
    booleans: [], dates: ['entryDate']
  },
  contactInformation: {
    strings: ['mobileNumber', 'alternateMobileNumber', 'telephoneNumber', 'institutionalEmail', 'alternateEmail'], booleans: [], dates: []
  },
  educationalBackground: {
    strings: ['previousSchool', 'seniorHigh', 'juniorHigh', 'elementary'], booleans: [], dates: []
  },
  healthInformation: {
    strings: ['otherCondition', 'allergyDetails', 'conditionDescription', 'accommodationNotes', 'physicalActivityClearance', 'otherAssistanceDetails', 'emergencyContactName', 'emergencyContactNumber'], booleans: ['hasRelevantHealthConcern', 'accommodationRequired'], dates: ['lastUpdated'], arrays: ['conditions', 'assistanceNeeds']
  }
};

const TECHNOLOGY_PROGRAMS = [
  'Bachelor of Information Technology',
  'Entertainment and Multimedia Computing',
  'Electronics',
  'Food Technology',
  'Automotive Technology'
];

const validateAndNormalizeStudentProfile = (body, {
  allowClassification = false,
  allowEnrollmentInformation = false,
  allowInstitutionalContact = false
} = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be an object' };
  }

  const allowedSections = [
    ...Object.keys(PROFILE_SECTION_RULES).filter((section) =>
      (allowEnrollmentInformation || section !== 'enrollmentInformation')
    ),
    'addresses'
  ];
  const bodySections = Object.keys(body);

  if (bodySections.length === 0) {
    return { error: 'At least one profile section is required' };
  }

  if (body.classification && !allowClassification) {
    const restrictedClassFields = ['program', 'studentType'];
    for (const field of restrictedClassFields) {
      if (body.classification[field] !== undefined) {
        return { error: `classification.${field} is system-controlled or not editable` };
      }
    }
  }

  if (body.enrollmentInformation && !allowEnrollmentInformation) {
    return { error: 'enrollmentInformation is system-controlled or not editable' };
  }

  const unsupportedSection = bodySections.find((section) => !allowedSections.includes(section));
  if (unsupportedSection) {
    return { error: `${unsupportedSection} is system-controlled or not editable` };
  }

  const normalized = {};

  for (const sectionName of bodySections) {
    if (sectionName === 'addresses') continue;
    const value = body[sectionName];
    const rules = PROFILE_SECTION_RULES[sectionName];

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { error: `${sectionName} must be an object` };
    }

    const fields = Object.keys(value);
    if (fields.length === 0) {
      return { error: `${sectionName} must include at least one field` };
    }

    if (sectionName === 'contactInformation' && value.institutionalEmail !== undefined && !allowInstitutionalContact) {
      return { error: 'contactInformation.institutionalEmail is system-controlled or not editable' };
    }

    const supportedFields = [...rules.strings, ...rules.booleans, ...rules.dates, ...(rules.arrays || []), ...(sectionName === 'religiousInformation' ? ['spiritualActivities'] : []), ...(sectionName === 'healthInformation' ? ['medicalCertificate'] : [])];
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
      if (field === 'physicalActivityClearance' && value[field] && !PHYSICAL_ACTIVITY_OPTIONS.includes(value[field])) {
        return { error: 'healthInformation.physicalActivityClearance contains an unsupported clearance option' };
      }
      const maxLen = (field === 'accommodationNotes' || field === 'conditionDescription' || field === 'otherAssistanceDetails') ? 1000 : 200;
      if (value[field].length > maxLen) {
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

    for (const field of rules.arrays || []) {
      if (value[field] === undefined) continue;
      if (!Array.isArray(value[field]) || value[field].some((item) => typeof item !== 'string')) return { error: `${sectionName}.${field} must be an array of strings` };
      const items = [...new Set(value[field].map((item) => item.trim()))];
      if (field === 'conditions') {
        if (items.some((item) => !HEALTH_CONDITIONS.includes(item))) return { error: `${sectionName}.${field} contains an unsupported condition` };
        if (items.includes('None') && items.length > 1) return { error: `${sectionName}.${field} cannot include None with another condition` };
      } else if (field === 'assistanceNeeds') {
        if (items.some((item) => !ASSISTANCE_NEEDS_OPTIONS.includes(item))) return { error: `${sectionName}.${field} contains an unsupported assistance option` };
      }
      normalized[sectionName][field] = items;
    }
    if (sectionName === 'religiousInformation' && value.spiritualActivities !== undefined) {
      const activities = validateActivities(value.spiritualActivities);
      if (activities.error) return activities;
      normalized[sectionName].spiritualActivities = activities.value;
    }
    if (sectionName === 'healthInformation' && value.medicalCertificate !== undefined) {
      if (value.medicalCertificate === null || value.medicalCertificate === '') {
        normalized[sectionName].medicalCertificate = null;
      } else if (typeof value.medicalCertificate === 'object' && !Array.isArray(value.medicalCertificate)) {
        const { fileName, fileData, fileType, fileSize, uploadedAt } = value.medicalCertificate;
        if (!fileName || typeof fileName !== 'string' || !fileData || typeof fileData !== 'string') {
          return { error: 'healthInformation.medicalCertificate must include fileName and fileData' };
        }
        if (fileData.length > 68 * 1024 * 1024) {
          return { error: 'healthInformation.medicalCertificate file must not exceed 50MB' };
        }
        normalized[sectionName].medicalCertificate = {
          fileName: fileName.slice(0, 255).trim(),
          fileData: fileData.trim(),
          fileType: typeof fileType === 'string' ? fileType.slice(0, 100).trim() : '',
          fileSize: typeof fileSize === 'number' ? fileSize : 0,
          uploadedAt: uploadedAt ? new Date(uploadedAt) : new Date()
        };
      } else {
        return { error: 'healthInformation.medicalCertificate must be an object or null' };
      }
    }
    if (sectionName === 'healthInformation' && value.hasRelevantHealthConcern === false && (value.conditions || []).length > 0) return { error: 'healthInformation.conditions must be empty when no relevant health concern is reported' };
  }

  if (body.addresses !== undefined) {
    const addresses = body.addresses;
    if (!addresses || typeof addresses !== 'object' || Array.isArray(addresses)) return { error: 'addresses must be an object' };
    const allowedAddresses = ['presentAddress', 'homeAddress'];
    const unsupportedAddress = Object.keys(addresses).find((field) => !allowedAddresses.includes(field));
    if (unsupportedAddress) return { error: `addresses.${unsupportedAddress} is not editable` };
    normalized.addresses = {};
    for (const addressName of Object.keys(addresses)) {
      const address = addresses[addressName];
      if (!address || typeof address !== 'object' || Array.isArray(address)) return { error: `addresses.${addressName} must be an object` };
      const allowedFields = ['street', 'barangay', 'municipality', 'province', 'region', 'country', 'zipCode'];
      const unsupportedField = Object.keys(address).find((field) => !allowedFields.includes(field));
      if (unsupportedField) return { error: `addresses.${addressName}.${unsupportedField} is not editable` };
      normalized.addresses[addressName] = {};
      for (const field of Object.keys(address)) {
        if (typeof address[field] !== 'string' || address[field].length > 200) return { error: `addresses.${addressName}.${field} must be a string of at most 200 characters` };
        normalized.addresses[addressName][field] = address[field].trim();
      }
    }
  }

  return { value: normalized };
};

module.exports = { HEALTH_CONDITIONS, PHYSICAL_ACTIVITY_OPTIONS, ASSISTANCE_NEEDS_OPTIONS, validateAndNormalizeStudentProfile };
