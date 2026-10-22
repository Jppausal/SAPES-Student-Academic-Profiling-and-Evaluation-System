import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  FileText,
  UploadCloud,
  Trash2,
  Eye,
  Download,
  Loader2,
} from 'lucide-react';
import { AddressSelector } from './AddressSelector';
import {
  StudentIdentity,
  StudentProfileUpdate,
  MedicalCertificateAttachment,
  updateMyStudentProfile,
} from '../../lib/api';
import { TECHNOLOGY_PROGRAMS } from '../../lib/academicPrograms';
import { formatStatusLabel } from '../../utils/formatStatusLabel';
import { calculateStudentProfileCompletion } from '../../utils/studentProfileCompletion';
import { StudentProfilePhoto } from '../common/StudentProfilePhoto';

interface StudentProfileSetupProps {
  identity: StudentIdentity;
  isOnboarding?: boolean;
  onSaved: (identity: StudentIdentity) => void;
}

type ProfileSection = 'personal' | 'contact' | 'education' | 'guardian';

const HEALTH_CONDITIONS = [
  'None',
  'Anemia',
  'Anxiety',
  'Asthma',
  'Blood Clots',
  'Cerebrovascular Accident',
  'Depression',
  'Hypertension',
  'Thyroid Disease',
  'Allergies',
  'Arthritis',
  'Cancer',
  'Diabetes',
  'Migraine Headaches',
  'Peptic Ulcer Disease',
  'Seizure Disorder',
  'Other',
];

const PHYSICAL_ACTIVITY_OPTIONS = [
  { value: 'can_attend_all', label: 'Cleared for all physical activities & PE' },
  { value: 'restricted', label: 'Restricted — Light physical activities only' },
  { value: 'cannot_attend', label: 'Excused — Not cleared to attend physical activities' },
  { value: 'none', label: 'No restrictions specified' },
];

const ASSISTANCE_NEEDS_OPTIONS = [
  'Wheelchair / Ramp Access',
  'Ground Floor Classroom Placement',
  'Frequent Rest / Medical Breaks',
  'Visual / Hearing Assistance',
  'Emergency Medication Standby',
  'Special Seating Arrangement',
  'Other',
];

const RELIGION_OPTIONS = [
  'Catholic',
  'Protestant / Other Christian',
  'Iglesia ni Cristo',
  'Islam',
  'Buddhism',
  'Hinduism',
  'Judaism',
  'Sikhism',
  'Traditional / Indigenous beliefs',
  'No religious affiliation',
  'Prefer not to say',
];

const emptyProfile: StudentProfileUpdate = {
  personalInformation: {},
  religiousInformation: {},
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const StudentProfileSetup: React.FC<StudentProfileSetupProps> = ({
  identity,
  isOnboarding = false,
  onSaved,
}) => {
  const [profile, setProfile] = useState<StudentProfileUpdate>(emptyProfile);
  const [savedProfile, setSavedProfile] = useState<StudentProfileUpdate>(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isOtherReligion, setIsOtherReligion] = useState(false);
  const [activeSection, setActiveSection] = useState<ProfileSection>('personal');

  useEffect(() => {
    const nextProfile: StudentProfileUpdate = {
      classification: {
        isShifter: Boolean(identity.classification?.isShifter),
        isTransferee: Boolean(identity.classification?.isTransferee),
        isIP: Boolean(identity.classification?.isIP),
        isPWD: Boolean(identity.classification?.isPWD),
      },
      personalInformation: { ...identity.personalInformation },
      religiousInformation: { ...identity.religiousInformation },
      contactInformation: {
        mobileNumber: identity.contactInformation?.mobileNumber || '',
        alternateMobileNumber: identity.contactInformation?.alternateMobileNumber || '',
        telephoneNumber: identity.contactInformation?.telephoneNumber || '',
        alternateEmail: identity.contactInformation?.alternateEmail || '',
      },
      educationalBackground: { ...identity.educationalBackground },
      addresses: {
        presentAddress: { ...identity.addresses?.presentAddress },
        homeAddress: { ...identity.addresses?.homeAddress },
      },
      healthInformation: { ...identity.healthInformation },
    };
    setProfile(nextProfile);
    setSavedProfile(nextProfile);
    setIsOtherReligion(false);
  }, [identity]);

  const setPersonal = (
    field: keyof NonNullable<StudentProfileUpdate['personalInformation']>,
    value: string | boolean
  ) => {
    setProfile((current) => ({
      ...current,
      personalInformation: { ...current.personalInformation, [field]: value },
    }));
  };

  const setContext = (
    section: 'contactInformation' | 'educationalBackground',
    field: string,
    value: string
  ) => {
    setProfile((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value },
    }));
  };

  const setHealth = (
    field: keyof NonNullable<StudentProfileUpdate['healthInformation']>,
    value: string | boolean | string[] | MedicalCertificateAttachment | null
  ) => {
    setProfile((current) => ({
      ...current,
      healthInformation: { ...current.healthInformation, [field]: value },
    }));
  };

  const toggleCondition = (condition: string) => {
    const conditions = profile.healthInformation?.conditions || [];
    const next =
      condition === 'None'
        ? conditions.includes('None')
          ? []
          : ['None']
        : conditions.includes(condition)
        ? conditions.filter((item) => item !== condition)
        : [...conditions.filter((item) => item !== 'None'), condition];
    setProfile((current) => ({
      ...current,
      healthInformation: {
        ...current.healthInformation,
        conditions: next,
        hasRelevantHealthConcern: next.length > 0,
      },
    }));
  };

  const toggleAssistanceNeed = (need: string) => {
    const currentNeeds = profile.healthInformation?.assistanceNeeds || [];
    const next = currentNeeds.includes(need)
      ? currentNeeds.filter((item) => item !== need)
      : [...currentNeeds, need];
    setHealth('assistanceNeeds', next);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a valid document or image (PDF, PNG, or JPG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must not exceed 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setHealth('medicalCertificate', {
        fileName: file.name,
        fileData: result,
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
      });
      setMessage(`Medical document "${file.name}" attached successfully.`);
      setError('');
    };
    reader.onerror = () => {
      setError('Failed to read the selected file. Please try again.');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleRemoveMedicalCertificate = () => {
    setHealth('medicalCertificate', null);
    setMessage('Medical certificate document removed.');
  };

  const handleOpenCertificate = (cert: MedicalCertificateAttachment) => {
    if (!cert.fileData) return;
    const win = window.open();
    if (win) {
      if (cert.fileType === 'application/pdf') {
        win.document.write(
          `<title>${cert.fileName}</title><iframe src="${cert.fileData}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`
        );
      } else {
        win.document.write(
          `<title>${cert.fileName}</title><body style="margin:0; background:#111; display:flex; justify-content:center; align-items:center; min-height:100vh;"><img src="${cert.fileData}" style="max-width:100%; max-height:100vh; object-fit:contain;" alt="${cert.fileName}" /></body>`
        );
      }
    }
  };

  const handleDownloadCertificate = (cert: MedicalCertificateAttachment) => {
    const a = document.createElement('a');
    a.href = cert.fileData;
    a.download = cert.fileName || 'medical_certificate';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const setAddress = (
    address: 'presentAddress' | 'homeAddress',
    field: string,
    value: string
  ) => {
    setProfile((current) => ({
      ...current,
      addresses: {
        ...current.addresses,
        [address]: { ...current.addresses?.[address], [field]: value },
      },
    }));
  };

  const setActivities = (
    spiritualActivities: Array<{ dayOfWeek: string; startTime: string; endTime: string }>
  ) =>
    setProfile((current) => ({
      ...current,
      religiousInformation: { ...current.religiousInformation, spiritualActivities },
    }));

  const changedSections = Object.keys(profile).filter(
    (section) =>
      JSON.stringify(profile[section as keyof StudentProfileUpdate]) !==
      JSON.stringify(savedProfile[section as keyof StudentProfileUpdate])
  );

  const isDirty = changedSections.length > 0;

  const handleDiscardChanges = () => {
    setProfile(savedProfile);
    setMessage('');
    setError('');
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');
    const firstName = profile.personalInformation?.firstName?.trim();
    const lastName = profile.personalInformation?.lastName?.trim();
    if (!firstName || !lastName) {
      setError('First name and last name are required before saving.');
      return;
    }
    setSaving(true);
    try {
      const nextProfile = changedSections.includes('healthInformation')
        ? {
            ...profile,
            healthInformation: {
              ...profile.healthInformation,
              lastUpdated: new Date().toISOString(),
            },
          }
        : profile;
      const payload = Object.fromEntries(
        Object.entries(nextProfile).filter(
          ([, value]) => value && typeof value === 'object' && Object.keys(value).length > 0
        )
      ) as StudentProfileUpdate;
      const updatedIdentity = await updateMyStudentProfile(payload);
      onSaved(updatedIdentity);
      setSavedProfile(nextProfile);
      setMessage('Your student profile was saved successfully.');
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to save your profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  const personal = profile.personalInformation || {};
  const enrollment = identity.enrollmentInformation || {};
  const contact = profile.contactInformation || {};
  const education = profile.educationalBackground || {};
  const health = profile.healthInformation || {};
  const addresses = profile.addresses || {};
  const religion = profile.religiousInformation?.religion || '';
  const hasCustomReligion = Boolean(religion && !RELIGION_OPTIONS.includes(religion));
  const assignedProgram = enrollment.course || identity.classification?.program || '';
  const assignedProgramLabel =
    TECHNOLOGY_PROGRAMS.find((program) => program.value === assignedProgram)?.label ||
    assignedProgram;
  const institutionalEmail = identity.contactInformation?.institutionalEmail || '';
  const profileCompletion = calculateStudentProfileCompletion({
    ...identity,
    personalInformation: { ...identity.personalInformation, ...profile.personalInformation },
    contactInformation: { ...identity.contactInformation, ...profile.contactInformation },
    addresses: { ...identity.addresses, ...profile.addresses },
    educationalBackground: {
      ...identity.educationalBackground,
      ...profile.educationalBackground,
    },
    healthInformation: { ...identity.healthInformation, ...profile.healthInformation },
    religiousInformation: {
      ...identity.religiousInformation,
      ...profile.religiousInformation,
    },
  });
  const profileName =
    [personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(' ') ||
    'Student name';
  const profileProgram =
    enrollment.course || identity.classification?.program || 'Program not assigned';
  const profileYearLevel =
    enrollment.yearLevel || enrollment.level || 'Year level not assigned';
  const enrollmentStatus =
    identity.enrollmentInformation?.enrollmentStatus || 'Profile on file';

  return (
    <div className="student-profile-layout">
      <nav className="student-profile-tabs" aria-label="Profile sections">
        {([
          ['personal', 'Personal Information'],
          ['contact', 'Contact Information'],
          ['education', 'Educational Background'],
          ['guardian', 'Guardian & Support'],
        ] as const).map(([section, label]) => (
          <button
            key={section}
            id={`profile-tab-${section}`}
            type="button"
            aria-current={activeSection === section ? 'page' : undefined}
            className={activeSection === section ? 'active' : ''}
            onClick={() => setActiveSection(section)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="student-profile-editor">
        <aside className="student-profile-summary" aria-label="Student profile summary">
          <div className="student-profile-summary-main">
            <StudentProfilePhoto
              institutionId={identity.institutionId}
              studentName={profileName}
              className="student-profile-summary-photo"
            />
            <h2>{profileName}</h2>
            <p className="student-profile-summary-id">{identity.institutionId}</p>
            <p className="student-profile-summary-program">{profileProgram}</p>
            <p className="student-profile-summary-year">
              {profileYearLevel}
              {enrollment.section ? ` · Section ${enrollment.section}` : ''}
            </p>
            <span className="student-profile-summary-status">
              <CheckCircle2 aria-hidden="true" />
              {formatStatusLabel(enrollmentStatus)}
            </span>
          </div>
          <div className="student-profile-summary-completion">
            <div>
              <span>Profile completion</span>
              <strong>{profileCompletion}%</strong>
            </div>
            <progress value={profileCompletion} max={100} aria-label="Profile completion" />
          </div>
        </aside>

        <form
          id="student-profile-panel"
          onSubmit={handleSaveProfile}
          className="student-profile-form"
        >
          <header className="student-profile-heading">
            <h2>
              {activeSection === 'personal'
                ? 'Personal Information'
                : activeSection === 'contact'
                ? 'Contact Information'
                : activeSection === 'education'
                ? 'Educational Background'
                : 'Guardian & Support'}
            </h2>
            <p>
              {isOnboarding
                ? 'Complete your student profile to keep your academic information up to date.'
                : 'Update your profile information. Changes can be saved directly.'}
            </p>
          </header>

          {message && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{message}</span>
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
            >
              {error}
            </div>
          )}

          {activeSection === 'personal' && (
            <>
              <section
                id="student-personal"
                className="student-form-section"
                aria-labelledby="student-personal-heading"
              >
                <h3 id="student-personal-heading">Personal Information</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold">
                    Institution ID{' '}
                    <input
                      value={identity.institutionId}
                      readOnly
                      className="mt-1 w-full px-3 py-2 bg-slate-100 cursor-not-allowed"
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    First name *
                    <input
                      required
                      value={personal.firstName || ''}
                      onChange={(event) => setPersonal('firstName', event.target.value)}
                      className="mt-1 w-full px-3 py-2"
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Middle name
                    <input
                      value={personal.middleName || ''}
                      onChange={(event) => setPersonal('middleName', event.target.value)}
                      className="mt-1 w-full px-3 py-2"
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Last name *
                    <input
                      required
                      value={personal.lastName || ''}
                      onChange={(event) => setPersonal('lastName', event.target.value)}
                      className="mt-1 w-full px-3 py-2"
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Suffix
                    <input
                      placeholder="Jr., Sr., III"
                      value={personal.suffix || ''}
                      onChange={(event) => setPersonal('suffix', event.target.value)}
                      className="mt-1 w-full px-3 py-2"
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Birth date
                    <input
                      type="date"
                      value={personal.birthDate ? String(personal.birthDate).slice(0, 10) : ''}
                      onChange={(event) => setPersonal('birthDate', event.target.value)}
                      className="mt-1 w-full px-3 py-2"
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Birth place
                    <input
                      value={personal.birthPlace || ''}
                      onChange={(event) => setPersonal('birthPlace', event.target.value)}
                      className="mt-1 w-full px-3 py-2"
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Sex
                    <select
                      value={personal.sex || ''}
                      onChange={(event) => setPersonal('sex', event.target.value)}
                      className="mt-1 w-full px-3 py-2"
                    >
                      <option value="">Select</option>
                      <option>Female</option>
                      <option>Male</option>
                      <option>Prefer not to say</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold">
                    Civil status
                    <select
                      value={personal.civilStatus || ''}
                      onChange={(event) => setPersonal('civilStatus', event.target.value)}
                      className="mt-1 w-full px-3 py-2"
                    >
                      <option value="">Select</option>
                      <option>Single</option>
                      <option>Married</option>
                      <option>Widowed</option>
                      <option>Separated</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold">
                    Nationality
                    <input
                      value={personal.nationality || ''}
                      onChange={(event) => setPersonal('nationality', event.target.value)}
                      className="mt-1 w-full px-3 py-2"
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Citizenship
                    <input
                      value={personal.citizenship || ''}
                      onChange={(event) => setPersonal('citizenship', event.target.value)}
                      className="mt-1 w-full px-3 py-2"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 shrink-0"
                      checked={personal.isForeigner || false}
                      onChange={(event) => setPersonal('isForeigner', event.target.checked)}
                    />{' '}
                    I am a foreign national
                  </label>
                  <label className="text-xs font-semibold">
                    Dual citizenship
                    <input
                      value={personal.dualCitizenship || ''}
                      onChange={(event) => setPersonal('dualCitizenship', event.target.value)}
                      className="mt-1 w-full px-3 py-2"
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Blood type
                    <select
                      value={personal.bloodType || ''}
                      onChange={(event) => setPersonal('bloodType', event.target.value)}
                      className="mt-1 w-full px-3 py-2"
                    >
                      <option value="">Select</option>
                      <option>A+</option>
                      <option>A-</option>
                      <option>B+</option>
                      <option>B-</option>
                      <option>AB+</option>
                      <option>AB-</option>
                      <option>O+</option>
                      <option>O-</option>
                      <option>Unknown</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold">
                    Height
                    <input
                      value={personal.height || ''}
                      onChange={(event) => setPersonal('height', event.target.value)}
                      placeholder="e.g. 165 cm"
                      className="mt-1 w-full px-3 py-2"
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Weight
                    <input
                      value={personal.weight || ''}
                      onChange={(event) => setPersonal('weight', event.target.value)}
                      placeholder="e.g. 60 kg"
                      className="mt-1 w-full px-3 py-2"
                    />
                  </label>
                </div>
              </section>
              <section
                id="student-classifications"
                className="student-form-section"
                aria-labelledby="student-classifications-heading"
              >
                <h3 id="student-classifications-heading">Student Classifications</h3>
                <p className="mt-1 text-sm">
                  Select all that apply. These flags do not change your academic standing or assigned program.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {(['isShifter', 'isTransferee', 'isIP', 'isPWD'] as const).map((field) => (
                    <label key={field} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={profile.classification?.[field] || false}
                        onChange={(event) =>
                          setProfile((current) => ({
                            ...current,
                            classification: {
                              ...current.classification,
                              [field]: event.target.checked,
                            },
                          }))
                        }
                      />
                      {
                        {
                          isShifter: 'Shifter',
                          isTransferee: 'Transferee',
                          isIP: 'Indigenous Peoples (IP)',
                          isPWD: 'Person with Disability (PWD)',
                        }[field]
                      }
                    </label>
                  ))}
                </div>
              </section>
            </>
          )}

          {activeSection === 'education' && (
            <>
              <section
                id="student-enrollment"
                className="student-form-section"
                aria-labelledby="student-enrollment-heading"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 id="student-enrollment-heading">Enrollment Information</h3>
                    <p className="mt-1 text-xs">
                      Assigned by the registrar or authorized academic staff.
                    </p>
                  </div>
                  <span className="self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    View only
                  </span>
                </div>
                <dl className="mt-4 grid overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 sm:grid-cols-2">
                  {[
                    ['Degree program', assignedProgramLabel],
                    ['Curriculum', enrollment.curriculum],
                    ['Year level', enrollment.yearLevel || enrollment.level],
                    ['Department', enrollment.department],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="border-b border-slate-200 px-4 py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-child(odd)]:border-r"
                    >
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        {label}
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-800">
                        {value || 'Not assigned yet'}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-slate-500">
                  Contact the registrar if any assigned enrollment information is incorrect.
                </p>
              </section>

              <section
                id="student-education"
                className="student-form-section"
                aria-labelledby="student-education-heading"
              >
                <h3 id="student-education-heading">Educational Background</h3>
                <p className="mt-1 text-xs">
                  Provide your previous schools for student profiling and record verification.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold">
                    Senior high school
                    <input
                      value={education.seniorHigh || ''}
                      onChange={(event) =>
                        setContext('educationalBackground', 'seniorHigh', event.target.value)
                      }
                      placeholder="Full name of school"
                      className="mt-1 w-full px-3 py-2"
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Previous college or university{' '}
                    <span className="font-normal text-slate-500">(if applicable)</span>
                    <input
                      value={education.previousSchool || ''}
                      onChange={(event) =>
                        setContext('educationalBackground', 'previousSchool', event.target.value)
                      }
                      placeholder="For transferees or students with prior enrollment"
                      className="mt-1 w-full px-3 py-2"
                    />
                  </label>
                </div>
              </section>

              <section className="student-readonly-note">
                <h3>System-controlled academic information</h3>
                <p className="mt-1">
                  Academic status, grades, GWA, academic records, faculty evaluations, and status
                  history are read-only and cannot be changed here.
                </p>
              </section>
            </>
          )}

          {activeSection === 'contact' && (
            <>
              <section
                id="student-contact"
                className="student-form-section"
                aria-labelledby="student-contact-heading"
              >
                <h3 id="student-contact-heading">Contact Information</h3>
                <p className="mt-1 text-xs">
                  Update the contact details the university may use to reach you.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold text-slate-700">Institutional email</p>
                    <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                      {institutionalEmail || 'Not linked to this account'}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Managed through your institutional account.
                    </p>
                  </div>
                  <label className="text-xs font-semibold">
                    Primary mobile number
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={contact.mobileNumber || ''}
                      onChange={(event) =>
                        setContext('contactInformation', 'mobileNumber', event.target.value)
                      }
                      placeholder="e.g. 0917 123 4567"
                      className="mt-1 w-full px-3 py-2"
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Alternate mobile number{' '}
                    <span className="font-normal text-slate-500">(optional)</span>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={contact.alternateMobileNumber || ''}
                      onChange={(event) =>
                        setContext(
                          'contactInformation',
                          'alternateMobileNumber',
                          event.target.value
                        )
                      }
                      placeholder="Another reachable number"
                      className="mt-1 w-full px-3 py-2"
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Telephone number{' '}
                    <span className="font-normal text-slate-500">(optional)</span>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={contact.telephoneNumber || ''}
                      onChange={(event) =>
                        setContext('contactInformation', 'telephoneNumber', event.target.value)
                      }
                      placeholder="Area code and number"
                      className="mt-1 w-full px-3 py-2"
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Alternate email{' '}
                    <span className="font-normal text-slate-500">(optional)</span>
                    <input
                      type="email"
                      autoComplete="email"
                      value={contact.alternateEmail || ''}
                      onChange={(event) =>
                        setContext('contactInformation', 'alternateEmail', event.target.value)
                      }
                      placeholder="Personal email address"
                      className="mt-1 w-full px-3 py-2"
                    />
                  </label>
                </div>
              </section>

              <section
                id="student-address"
                className="student-form-section"
                aria-labelledby="student-address-heading"
              >
                <h3 id="student-address-heading">Address Information</h3>
                <p className="mt-1 text-xs">
                  Choose Philippine locations by region, province, municipality, and barangay.
                  International addresses remain manually editable.
                </p>
                <div className="mt-4 grid gap-5 lg:grid-cols-2">
                  <AddressSelector
                    title="Present address"
                    address={addresses.presentAddress || {}}
                    onChange={(field, value) => setAddress('presentAddress', field, value)}
                  />
                  <AddressSelector
                    title="Home address"
                    address={addresses.homeAddress || {}}
                    onChange={(field, value) => setAddress('homeAddress', field, value)}
                  />
                </div>
              </section>
            </>
          )}

          {activeSection === 'guardian' && (
            <>
              <section
                id="student-health"
                className="student-form-section"
                aria-labelledby="student-health-heading"
              >
                <h3 id="student-health-heading">Relevant Health Accommodations</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Only accommodation information necessary for academic evaluation, physical safety,
                  and accessibility is shared with authorized faculty.
                </p>

                <div className="mt-4 space-y-4">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 shrink-0"
                      checked={Boolean(health.hasRelevantHealthConcern)}
                      onChange={(event) =>
                        setHealth('hasRelevantHealthConcern', event.target.checked)
                      }
                    />
                    I have a relevant health concern or medical condition
                  </label>

                  {health.hasRelevantHealthConcern && (
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                      <p className="text-xs font-semibold text-slate-700">
                        Medical history: select all that apply
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {HEALTH_CONDITIONS.map((condition) => (
                          <label
                            key={condition}
                            className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-brand-600 shrink-0"
                              checked={(health.conditions || []).includes(condition)}
                              onChange={() => toggleCondition(condition)}
                            />
                            {condition}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {(health.conditions || []).includes('Other') && (
                    <label className="block text-xs font-semibold">
                      Other medical condition
                      <textarea
                        value={health.otherCondition || ''}
                        onChange={(event) => setHealth('otherCondition', event.target.value)}
                        placeholder="Specify other medical conditions..."
                        className="mt-1 min-h-16 w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                      />
                    </label>
                  )}

                  {(health.conditions || []).includes('Allergies') && (
                    <label className="block text-xs font-semibold">
                      Allergy details
                      <textarea
                        value={health.allergyDetails || ''}
                        onChange={(event) => setHealth('allergyDetails', event.target.value)}
                        placeholder="Specify allergen triggers and symptoms..."
                        className="mt-1 min-h-16 w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                      />
                    </label>
                  )}

                  {/* Physical Activity Participation Clearance */}
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Physical Activity &amp; P.E. Participation
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Specify if you are cleared to attend physical education classes, sports activities, or active drills.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {PHYSICAL_ACTIVITY_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                            (health.physicalActivityClearance || 'none') === option.value
                              ? 'border-brand-500 bg-brand-50/50 text-brand-900 font-semibold'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="physicalActivityClearance"
                            value={option.value}
                            checked={(health.physicalActivityClearance || 'none') === option.value}
                            onChange={(e) =>
                              setHealth('physicalActivityClearance', e.target.value)
                            }
                            className="mt-0.5 h-4 w-4 text-brand-600 border-slate-300 shrink-0"
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Academic Accommodation & Medical Assistance Needs */}
                  <div className="pt-3 border-t border-slate-200 space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 shrink-0"
                        checked={Boolean(health.accommodationRequired)}
                        onChange={(event) =>
                          setHealth('accommodationRequired', event.target.checked)
                        }
                      />
                      I require an academic accommodation or medical assistance
                    </label>

                    {health.accommodationRequired && (
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">
                            Medical assistance &amp; support needed: select all that apply
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Choose the accommodations needed for your classroom and campus attendance.
                          </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {ASSISTANCE_NEEDS_OPTIONS.map((need) => (
                            <label
                              key={need}
                              className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-brand-600 shrink-0"
                                checked={(health.assistanceNeeds || []).includes(need)}
                                onChange={() => toggleAssistanceNeed(need)}
                              />
                              {need}
                            </label>
                          ))}
                        </div>

                        {(health.assistanceNeeds || []).includes('Other') && (
                          <label className="block text-xs font-semibold text-slate-800 pt-2">
                            Other medical assistance details
                            <textarea
                              value={health.otherAssistanceDetails || ''}
                              onChange={(e) =>
                                setHealth('otherAssistanceDetails', e.target.value)
                              }
                              placeholder="Describe the medical assistance or equipment needed (e.g., personal caregiver, special desk, scheduled glucose check)..."
                              className="mt-1 min-h-16 w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                            />
                          </label>
                        )}

                        <label className="block text-xs font-semibold text-slate-800 pt-2">
                          Accommodation notes for faculty
                          <textarea
                            value={health.accommodationNotes || ''}
                            onChange={(event) =>
                              setHealth('accommodationNotes', event.target.value)
                            }
                            placeholder="Additional instructions for professors and instructors..."
                            className="mt-1 min-h-20 w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Medical Proof / Med Cert Upload */}
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Medical Certificate &amp; Health Proof
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Upload official medical certificate, doctor&apos;s diagnosis, or clinic clearance (PDF, JPG, or PNG up to 5MB).
                      </p>
                    </div>

                    {health.medicalCertificate?.fileData ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {health.medicalCertificate.fileName}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {formatFileSize(health.medicalCertificate.fileSize)}
                              {health.medicalCertificate.uploadedAt
                                ? ` • Uploaded ${new Date(
                                    health.medicalCertificate.uploadedAt
                                  ).toLocaleDateString()}`
                                : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenCertificate(health.medicalCertificate!)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"
                            title="View document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDownloadCertificate(health.medicalCertificate!)
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            title="Download document"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveMedicalCertificate}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-white border border-rose-300 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors group">
                          <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-brand-600 transition-colors" />
                          <p className="mt-2 text-xs font-bold text-slate-700 group-hover:text-brand-700">
                            Click to upload medical certificate or proof
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            PDF, PNG, JPG, or JPEG up to 5MB
                          </p>
                          <input
                            type="file"
                            accept=".pdf,image/png,image/jpeg,image/jpg"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Private condition description & Emergency Contact */}
                  <div className="pt-3 border-t border-slate-200 space-y-3">
                    <label className="block text-xs font-semibold">
                      Private condition description (Confidential)
                      <textarea
                        value={health.conditionDescription || ''}
                        onChange={(event) =>
                          setHealth('conditionDescription', event.target.value)
                        }
                        placeholder="Any private health notes kept strictly between you and university health personnel..."
                        className="mt-1 min-h-20 w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-semibold">
                        Emergency contact name
                        <input
                          value={health.emergencyContactName || ''}
                          onChange={(event) =>
                            setHealth('emergencyContactName', event.target.value)
                          }
                          placeholder="e.g. Maria Santos (Parent/Guardian)"
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                        />
                      </label>
                      <label className="block text-xs font-semibold">
                        Emergency contact number
                        <input
                          value={health.emergencyContactNumber || ''}
                          onChange={(event) =>
                            setHealth('emergencyContactNumber', event.target.value)
                          }
                          placeholder="e.g. 0917-123-4567"
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              <section
                id="student-religion"
                className="student-form-section"
                aria-labelledby="student-religion-heading"
              >
                <h3 id="student-religion-heading">Religious Information</h3>
                <p className="mt-1 text-xs text-slate-500">
                  This is optional student-provided information. SAPES does not infer religion.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-semibold">
                    Religion or religious affiliation
                    <select
                      value={hasCustomReligion || isOtherReligion ? 'Other' : religion}
                      onChange={(event) => {
                        const value = event.target.value;
                        setIsOtherReligion(value === 'Other');
                        setProfile((current) => ({
                          ...current,
                          religiousInformation: {
                            religion: value === 'Other' ? '' : value,
                          },
                        }));
                      }}
                      className="mt-1 w-full px-3 py-2"
                    >
                      <option value="">Select an option</option>
                      {RELIGION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                      <option value="Other">Other: specify</option>
                    </select>
                  </label>
                  {(hasCustomReligion || isOtherReligion) && (
                    <label className="block text-xs font-semibold">
                      Other religion or affiliation
                      <input
                        value={hasCustomReligion ? religion : ''}
                        onChange={(event) =>
                          setProfile((current) => ({
                            ...current,
                            religiousInformation: { religion: event.target.value },
                          }))
                        }
                        placeholder="Optional"
                        className="mt-1 w-full px-3 py-2"
                      />
                    </label>
                  )}
                </div>
                <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <label className="flex items-center gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 shrink-0"
                      checked={Boolean(profile.religiousInformation?.shareSpiritualSchedule)}
                      onChange={(event) =>
                        setProfile((current) => ({
                          ...current,
                          religiousInformation: {
                            ...current.religiousInformation,
                            shareSpiritualSchedule: event.target.checked,
                          },
                        }))
                      }
                    />{' '}
                    Share recurring unavailable times with faculty scheduling staff
                  </label>
                  <p className="mt-1 text-xs text-slate-500">
                    Your religion is visible to faculty for enrollment considerations. Only the
                    day and time of your recurring unavailable times are shared, and only when you
                    opt in.
                  </p>
                  {profile.religiousInformation?.shareSpiritualSchedule && (
                    <div className="mt-3 space-y-2">
                      {(profile.religiousInformation.spiritualActivities || []).map(
                        (activity, index) => (
                          <div key={index} className="grid gap-2 sm:grid-cols-4">
                            <select
                              aria-label={`Unavailable day ${index + 1}`}
                              value={activity.dayOfWeek}
                              onChange={(event) =>
                                setActivities(
                                  (
                                    profile.religiousInformation?.spiritualActivities || []
                                  ).map((item, i) =>
                                    i === index ? { ...item, dayOfWeek: event.target.value } : item
                                  )
                                )
                              }
                              className="px-2 py-1.5 text-xs rounded border border-slate-300"
                            >
                              <option>Monday</option>
                              <option>Tuesday</option>
                              <option>Wednesday</option>
                              <option>Thursday</option>
                              <option>Friday</option>
                              <option>Saturday</option>
                              <option>Sunday</option>
                            </select>
                            <input
                              aria-label={`Start time ${index + 1}`}
                              type="time"
                              value={activity.startTime}
                              onChange={(event) =>
                                setActivities(
                                  (
                                    profile.religiousInformation?.spiritualActivities || []
                                  ).map((item, i) =>
                                    i === index ? { ...item, startTime: event.target.value } : item
                                  )
                                )
                              }
                              className="px-2 py-1.5 text-xs rounded border border-slate-300"
                            />
                            <input
                              aria-label={`End time ${index + 1}`}
                              type="time"
                              value={activity.endTime}
                              onChange={(event) =>
                                setActivities(
                                  (
                                    profile.religiousInformation?.spiritualActivities || []
                                  ).map((item, i) =>
                                    i === index ? { ...item, endTime: event.target.value } : item
                                  )
                                )
                              }
                              className="px-2 py-1.5 text-xs rounded border border-slate-300"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setActivities(
                                  (
                                    profile.religiousInformation?.spiritualActivities || []
                                  ).filter((_, i) => i !== index)
                                )
                              }
                              className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                              aria-label={`Remove unavailable time ${index + 1}`}
                            >
                              Remove
                            </button>
                          </div>
                        )
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setActivities([
                            ...(profile.religiousInformation?.spiritualActivities || []),
                            { dayOfWeek: 'Thursday', startTime: '18:00', endTime: '20:00' },
                          ])
                        }
                        className="text-xs font-bold text-brand-600 hover:text-brand-800"
                      >
                        + Add unavailable time
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          <div className="student-save-row flex items-center justify-between gap-3 pt-5 border-t border-slate-200">
            {isDirty ? (
              <button
                type="button"
                onClick={handleDiscardChanges}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Discard changes
              </button>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={saving || !isDirty}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-accent-500 rounded-xl hover:bg-accent-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving changes...</span>
                </>
              ) : (
                <span>Save changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
