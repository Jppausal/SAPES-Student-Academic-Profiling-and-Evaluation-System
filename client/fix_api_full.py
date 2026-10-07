import sys, re

with open('src/lib/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# I will just write a regex to replace the entire StudentProfileUpdate definition
match = re.search(r'export type StudentProfileUpdate = \{.*?\n\}', content, re.DOTALL)
if match:
    replacement = '''export type StudentProfileUpdate = {
  personalInformation?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    suffix?: string;
    birthDate?: string;
    birthPlace?: string;
    sex?: string;
    civilStatus?: string;
    nationality?: string;
    citizenship?: string;
    height?: string;
    weight?: string;
    bloodType?: string;
    dualCitizenship?: string;
    minority?: string;
    isForeigner?: boolean;
  };
  contactInformation?: {
    mobileNumber?: string;
    alternateMobileNumber?: string;
    telephoneNumber?: string;
    institutionalEmail?: string;
    alternateEmail?: string;
  };
  addresses?: { presentAddress?: Record<string, string>; homeAddress?: Record<string, string> };
  educationalBackground?: Record<string, string>;
  healthInformation?: { hasRelevantHealthConcern?: boolean; conditions?: string[]; otherCondition?: string; allergyDetails?: string; conditionDescription?: string; accommodationRequired?: boolean; accommodationNotes?: string; emergencyContactName?: string; emergencyContactNumber?: string; lastUpdated?: string };
  religiousInformation?: { religion?: string; shareSpiritualSchedule?: boolean; spiritualActivities?: Array<{ dayOfWeek: string; startTime: string; endTime: string }> };
  classification?: { program?: string; studentType?: string; indigenousGroup?: string; isIP?: boolean; isPWD?: boolean; isShifter?: boolean; isTransferee?: boolean };
  enrollmentInformation?: { course?: string; level?: string; department?: string; curriculum?: string; yearLevel?: string; entryPeriod?: string; studentType?: string; preferredModality?: string; campus?: string; learnerReferenceNo?: string; nstpNumber?: string; entryDate?: string };
}'''
    content = content[:match.start()] + replacement + content[match.end():]

with open('src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)
