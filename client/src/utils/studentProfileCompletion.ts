import { StudentIdentity } from '../lib/api';

export const calculateStudentProfileCompletion = (identity: StudentIdentity) => {
  const personal = identity.personalInformation;
  const contact = identity.contactInformation;
  const addresses = identity.addresses;
  const education = identity.educationalBackground;
  const health = identity.healthInformation;
  const hasAddress = (address?: Record<string, string>) =>
    Boolean(address && Object.values(address).some((value) => typeof value === 'string' && value.trim()));

  const sections = [
    Boolean(personal?.firstName?.trim() && personal.lastName?.trim()),
    Boolean(personal?.birthDate && personal.sex && personal.citizenship),
    Boolean(contact?.mobileNumber?.trim() && (contact.alternateEmail?.trim() || contact.institutionalEmail?.trim())),
    hasAddress(addresses?.presentAddress),
    hasAddress(addresses?.homeAddress),
    Boolean(education?.previousSchool?.trim() || education?.seniorHigh?.trim()),
    Boolean(identity.classification?.program?.trim() || identity.classification?.studentType?.trim()),
    Boolean(identity.religiousInformation?.religion?.trim()),
    Boolean(health?.emergencyContactName?.trim() && health.emergencyContactNumber?.trim()),
  ];

  return Math.round((sections.filter(Boolean).length / sections.length) * 100);
};
