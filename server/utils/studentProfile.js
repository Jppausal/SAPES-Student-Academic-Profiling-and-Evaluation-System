const HEALTH_CONDITIONS = ['None', 'Anemia', 'Anxiety', 'Asthma', 'Blood Clots', 'Cerebrovascular Accident', 'Depression', 'Hypertension', 'Thyroid Disease', 'Allergies', 'Arthritis', 'Cancer', 'Diabetes', 'Migraine Headaches', 'Peptic Ulcer Disease', 'Seizure Disorder', 'Other'];
const { validateActivities } = require('./scheduleConflicts');

const PROFILE_SECTION_RULES = {
  personalInformation: {
    strings: ['firstName', 'middleName', 'lastName', 'suffix', 'birthPlace', 'sex', 'civilStatus', 'height', 'weight', 'bloodType', 'nationality', 'citizenship', 'dualCitizenship', 'minority'],
    booleans: ['isForeigner'],
    dates: ['birthDate']
  },
  classification: {
    strings: ['studentType', 'indigenousGroup'],
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
    strings: ['otherCondition', 'allergyDetails', 'conditionDescription', 'accommodationNotes', 'emergencyContactName', 'emergencyContactNumber'], booleans: ['hasRelevantHealthConcern', 'accommodationRequired'], dates: ['lastUpdated'], arrays: ['conditions']
  }
};

const validateAndNormalizeStudentProfile = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be an object' };
  }

  const allowedSections = [...Object.keys(PROFILE_SECTION_RULES), 'addresses'];
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

    const supportedFields = [...rules.strings, ...rules.booleans, ...rules.dates, ...(rules.arrays || []), ...(sectionName === 'religiousInformation' ? ['spiritualActivities'] : [])];
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

    for (const field of rules.arrays || []) {
      if (value[field] === undefined) continue;
      if (!Array.isArray(value[field]) || value[field].some((item) => typeof item !== 'string')) return { error: `${sectionName}.${field} must be an array of strings` };
      const items = [...new Set(value[field].map((item) => item.trim()))];
      if (items.some((item) => !HEALTH_CONDITIONS.includes(item))) return { error: `${sectionName}.${field} contains an unsupported condition` };
      if (items.includes('None') && items.length > 1) return { error: `${sectionName}.${field} cannot include None with another condition` };
      normalized[sectionName][field] = items;
    }
    if (sectionName === 'religiousInformation' && value.spiritualActivities !== undefined) {
      const activities = validateActivities(value.spiritualActivities);
      if (activities.error) return activities;
      normalized[sectionName].spiritualActivities = activities.value;
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
      const allowedFields = ['street', 'barangay', 'municipality', 'province', 'country', 'zipCode'];
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

module.exports = { HEALTH_CONDITIONS, validateAndNormalizeStudentProfile };
