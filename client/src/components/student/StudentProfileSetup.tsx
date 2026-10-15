import React, { useEffect, useState } from 'react';
import { AddressSelector } from './AddressSelector';
import {
  StudentIdentity,
  StudentProfileUpdate,
  updateMyStudentProfile,
} from '../../lib/api';
import { TECHNOLOGY_PROGRAMS } from '../../lib/academicPrograms';

interface StudentProfileSetupProps {
  identity: StudentIdentity;
  isOnboarding?: boolean;
  onSaved: (identity: StudentIdentity) => void;
}

const HEALTH_CONDITIONS = ['None', 'Anemia', 'Anxiety', 'Asthma', 'Blood Clots', 'Cerebrovascular Accident', 'Depression', 'Hypertension', 'Thyroid Disease', 'Allergies', 'Arthritis', 'Cancer', 'Diabetes', 'Migraine Headaches', 'Peptic Ulcer Disease', 'Seizure Disorder', 'Other'];
const RELIGION_OPTIONS = ['Catholic', 'Protestant / Other Christian', 'Iglesia ni Cristo', 'Islam', 'Buddhism', 'Hinduism', 'Judaism', 'Sikhism', 'Traditional / Indigenous beliefs', 'No religious affiliation', 'Prefer not to say'];

const emptyProfile: StudentProfileUpdate = {
  personalInformation: {},
  religiousInformation: {},
};

const formatAddress = (addr?: {
  line1?: string;
  barangay?: string;
  cityMunicipality?: string;
  city?: string;
  province?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}) => {
  if (!addr) return 'Not provided';
  const parts = [
    addr.line1,
    addr.barangay,
    addr.cityMunicipality || addr.city,
    addr.province,
    addr.region,
    addr.postalCode,
    addr.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Not provided';
};

const ReviewField: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
    <dd className="mt-1 text-sm font-semibold text-slate-800 break-words">{value || 'Not provided'}</dd>
  </div>
);

export const StudentProfileSetup: React.FC<StudentProfileSetupProps> = ({
  identity,
  isOnboarding = false,
  onSaved,
}) => {
  const [profile, setProfile] = useState<StudentProfileUpdate>(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isOtherReligion, setIsOtherReligion] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    setProfile({
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
      addresses: { presentAddress: { ...identity.addresses?.presentAddress }, homeAddress: { ...identity.addresses?.homeAddress } },
      healthInformation: { ...identity.healthInformation },
    });
    setIsOtherReligion(false);
    setIsReviewing(false);
  }, [identity]);

  const setPersonal = (field: keyof NonNullable<StudentProfileUpdate['personalInformation']>, value: string | boolean) => {
    setProfile((current) => ({
      ...current,
      personalInformation: { ...current.personalInformation, [field]: value },
    }));
  };

  const setContext = (section: 'contactInformation' | 'educationalBackground', field: string, value: string) => {
    setProfile((current) => ({ ...current, [section]: { ...current[section], [field]: value } }));
  };

  const setHealth = (field: keyof NonNullable<StudentProfileUpdate['healthInformation']>, value: string | boolean | string[]) => {
    setProfile((current) => ({ ...current, healthInformation: { ...current.healthInformation, [field]: value } }));
  };

  const toggleCondition = (condition: string) => {
    const conditions = health.conditions || [];
    const next = condition === 'None'
      ? (conditions.includes('None') ? [] : ['None'])
      : conditions.includes(condition)
        ? conditions.filter((item) => item !== condition)
        : [...conditions.filter((item) => item !== 'None'), condition];
    setProfile((current) => ({ ...current, healthInformation: { ...current.healthInformation, conditions: next, hasRelevantHealthConcern: next.length > 0 } }));
  };

  const setAddress = (address: 'presentAddress' | 'homeAddress', field: string, value: string) => {
    setProfile((current) => ({ ...current, addresses: { ...current.addresses, [address]: { ...current.addresses?.[address], [field]: value } } }));
  };

  const setActivities = (spiritualActivities: Array<{ dayOfWeek: string; startTime: string; endTime: string }>) =>
    setProfile((current) => ({ ...current, religiousInformation: { ...current.religiousInformation, spiritualActivities } }));

  const handleReview = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');
    const firstName = profile.personalInformation?.firstName?.trim();
    const lastName = profile.personalInformation?.lastName?.trim();
    if (!firstName || !lastName) {
      setError('First name and last name are required before reviewing.');
      return;
    }
    setIsReviewing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToEdit = () => {
    setIsReviewing(false);
    setMessage('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = Object.fromEntries(Object.entries(profile).filter(([, value]) =>
        value && typeof value === 'object' && Object.keys(value).length > 0
      )) as StudentProfileUpdate;
      const updatedIdentity = await updateMyStudentProfile(payload);
      onSaved(updatedIdentity);
      setMessage('Your student profile was saved successfully.');
      setIsReviewing(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save your profile.');
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
  const assignedProgramLabel = TECHNOLOGY_PROGRAMS.find((program) => program.value === assignedProgram)?.label || assignedProgram;
  const institutionalEmail = identity.contactInformation?.institutionalEmail || '';

  return (
    <div className="student-profile-layout">
      <nav className="student-profile-index" aria-label="Profile sections">
        <p>{isReviewing ? 'Review sections' : 'In your profile'}</p>
        <a href={isReviewing ? '#review-personal' : '#student-personal'}>Personal information</a>
        <a href={isReviewing ? '#review-classifications' : '#student-classifications'}>Classifications</a>
        {!isReviewing && <a href="#student-enrollment">Enrollment information</a>}
        <a href={isReviewing ? '#review-contact' : '#student-contact'}>Contact information</a>
        <a href={isReviewing ? '#review-education' : '#student-education'}>Education background</a>
        <a href={isReviewing ? '#review-health' : '#student-health'}>Health accommodations</a>
        <a href={isReviewing ? '#review-address' : '#student-address'}>Addresses</a>
        <a href={isReviewing ? '#review-religion' : '#student-religion'}>Religious information</a>
      </nav>

      {isReviewing ? (
        <div className="student-profile-form">
          <header className="student-profile-heading">
            <h2>Review your profile</h2>
            <p>Please review your information carefully before confirming. Click &quot;Back to Edit&quot; to make changes, or &quot;Confirm &amp; Save&quot; to finalize.</p>
          </header>

          {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">{message}</div>}
          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{error}</div>}

          <section id="review-personal" className="student-form-section" aria-labelledby="review-personal-heading">
            <h3 id="review-personal-heading">Personal Information</h3>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <ReviewField label="Institution ID" value={identity.institutionId} />
              <ReviewField label="First name" value={personal.firstName} />
              <ReviewField label="Middle name" value={personal.middleName} />
              <ReviewField label="Last name" value={personal.lastName} />
              <ReviewField label="Suffix" value={personal.suffix} />
              <ReviewField label="Birth date" value={personal.birthDate ? String(personal.birthDate).slice(0, 10) : undefined} />
              <ReviewField label="Birth place" value={personal.birthPlace} />
              <ReviewField label="Sex" value={personal.sex} />
              <ReviewField label="Civil status" value={personal.civilStatus} />
              <ReviewField label="Nationality" value={personal.nationality} />
              <ReviewField label="Citizenship" value={personal.citizenship} />
              <ReviewField label="Foreign national" value={personal.isForeigner ? 'Yes' : 'No'} />
              <ReviewField label="Dual citizenship" value={personal.dualCitizenship} />
              <ReviewField label="Blood type" value={personal.bloodType} />
              <ReviewField label="Height" value={personal.height} />
              <ReviewField label="Weight" value={personal.weight} />
            </dl>
          </section>

          <section id="review-classifications" className="student-form-section" aria-labelledby="review-classifications-heading">
            <h3 id="review-classifications-heading">Student Classifications</h3>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <ReviewField label="Shifter" value={profile.classification?.isShifter ? 'Yes' : 'No'} />
              <ReviewField label="Transferee" value={profile.classification?.isTransferee ? 'Yes' : 'No'} />
              <ReviewField label="Indigenous Peoples (IP)" value={profile.classification?.isIP ? 'Yes' : 'No'} />
              <ReviewField label="Person with Disability (PWD)" value={profile.classification?.isPWD ? 'Yes' : 'No'} />
            </dl>
          </section>

          <section id="review-contact" className="student-form-section" aria-labelledby="review-contact-heading">
            <h3 id="review-contact-heading">Contact Information</h3>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <ReviewField label="Institutional email" value={institutionalEmail || 'Not linked to this account'} />
              </div>
              <ReviewField label="Primary mobile number" value={contact.mobileNumber} />
              <ReviewField label="Alternate mobile number" value={contact.alternateMobileNumber} />
              <ReviewField label="Telephone number" value={contact.telephoneNumber} />
              <ReviewField label="Alternate email" value={contact.alternateEmail} />
            </dl>
          </section>

          <section id="review-education" className="student-form-section" aria-labelledby="review-education-heading">
            <h3 id="review-education-heading">Educational Background</h3>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <ReviewField label="Senior high school" value={education.seniorHigh} />
              <ReviewField label="Previous college or university" value={education.previousSchool} />
            </dl>
          </section>

          <section id="review-health" className="student-form-section" aria-labelledby="review-health-heading">
            <h3 id="review-health-heading">Relevant Health Accommodations</h3>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <ReviewField label="Relevant health concern" value={health.hasRelevantHealthConcern ? 'Yes' : 'No'} />
              <ReviewField label="Conditions" value={health.conditions && health.conditions.length > 0 ? health.conditions.join(', ') : 'None'} />
              {(health.conditions || []).includes('Other') && <ReviewField label="Other condition" value={health.otherCondition} />}
              {(health.conditions || []).includes('Allergies') && <ReviewField label="Allergy details" value={health.allergyDetails} />}
              <ReviewField label="Accommodation required" value={health.accommodationRequired ? 'Yes' : 'No'} />
              {health.accommodationRequired && <ReviewField label="Accommodation notes" value={health.accommodationNotes} />}
              <ReviewField label="Private condition description" value={health.conditionDescription} />
              <ReviewField label="Emergency contact name" value={health.emergencyContactName} />
              <ReviewField label="Emergency contact number" value={health.emergencyContactNumber} />
            </dl>
          </section>

          <section id="review-address" className="student-form-section" aria-labelledby="review-address-heading">
            <h3 id="review-address-heading">Address Information</h3>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <ReviewField label="Present address" value={formatAddress(addresses.presentAddress)} />
              <ReviewField label="Home address" value={formatAddress(addresses.homeAddress)} />
            </dl>
          </section>

          <section id="review-religion" className="student-form-section" aria-labelledby="review-religion-heading">
            <h3 id="review-religion-heading">Religious Information</h3>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <ReviewField label="Religion or religious affiliation" value={religion || 'None / Not specified'} />
              <ReviewField label="Share recurring unavailable times" value={profile.religiousInformation?.shareSpiritualSchedule ? 'Yes' : 'No'} />
              {profile.religiousInformation?.shareSpiritualSchedule && (
                <div className="sm:col-span-2">
                  <ReviewField
                    label="Unavailable times"
                    value={
                      (profile.religiousInformation.spiritualActivities || []).length > 0
                        ? profile.religiousInformation.spiritualActivities.map((act) => `${act.dayOfWeek} ${act.startTime}–${act.endTime}`).join(', ')
                        : 'None scheduled'
                    }
                  />
                </div>
              )}
            </dl>
          </section>

          <section className="student-readonly-note">
            <h3>System-controlled academic information</h3>
            <p className="mt-1">Academic status, grades, GWA, academic records, faculty evaluations, and status history are read-only and cannot be changed here.</p>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={handleBackToEdit}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Back to Edit
            </button>
            <button
              type="button"
              onClick={handleConfirmSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Confirm & Save'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleReview} className="student-profile-form">
          <header className="student-profile-heading">
            <h2>{isOnboarding ? 'Complete your student profile' : 'Personal profile'}</h2>
            <p>Keep your information up to date for academic evaluation. Fields marked * are required.</p>
          </header>

          {message && <div role="status" className="flex items-center gap-2 px-4 py-3 text-xs">{message}</div>}
          {error && <div role="alert" className="px-4 py-3 text-xs">{error}</div>}

          <section id="student-personal" className="student-form-section" aria-labelledby="student-personal-heading">
            <h3 id="student-personal-heading">Personal Information</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold">Institution ID <input value={identity.institutionId} readOnly className="mt-1 w-full px-3 py-2" /></label>
              <label className="text-xs font-semibold">First name *<input required value={personal.firstName || ''} onChange={(event) => setPersonal('firstName', event.target.value)} className="mt-1 w-full px-3 py-2" /></label>
              <label className="text-xs font-semibold">Middle name<input value={personal.middleName || ''} onChange={(event) => setPersonal('middleName', event.target.value)} className="mt-1 w-full px-3 py-2" /></label>
              <label className="text-xs font-semibold">Last name *<input required value={personal.lastName || ''} onChange={(event) => setPersonal('lastName', event.target.value)} className="mt-1 w-full px-3 py-2" /></label>
              <label className="text-xs font-semibold">Suffix<input placeholder="Jr., Sr., III" value={personal.suffix || ''} onChange={(event) => setPersonal('suffix', event.target.value)} className="mt-1 w-full px-3 py-2" /></label>
              <label className="text-xs font-semibold">Birth date<input type="date" value={personal.birthDate ? String(personal.birthDate).slice(0, 10) : ''} onChange={(event) => setPersonal('birthDate', event.target.value)} className="mt-1 w-full px-3 py-2" /></label>
              <label className="text-xs font-semibold">Birth place<input value={personal.birthPlace || ''} onChange={(event) => setPersonal('birthPlace', event.target.value)} className="mt-1 w-full px-3 py-2" /></label>
              <label className="text-xs font-semibold">Sex<select value={personal.sex || ''} onChange={(event) => setPersonal('sex', event.target.value)} className="mt-1 w-full px-3 py-2"><option value="">Select</option><option>Female</option><option>Male</option><option>Prefer not to say</option></select></label>
              <label className="text-xs font-semibold">Civil status<select value={personal.civilStatus || ''} onChange={(event) => setPersonal('civilStatus', event.target.value)} className="mt-1 w-full px-3 py-2"><option value="">Select</option><option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option></select></label>
              <label className="text-xs font-semibold">Nationality<input value={personal.nationality || ''} onChange={(event) => setPersonal('nationality', event.target.value)} className="mt-1 w-full px-3 py-2" /></label>
              <label className="text-xs font-semibold">Citizenship<input value={personal.citizenship || ''} onChange={(event) => setPersonal('citizenship', event.target.value)} className="mt-1 w-full px-3 py-2" /></label>
              <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 shrink-0" checked={personal.isForeigner || false} onChange={(event) => setPersonal('isForeigner', event.target.checked)} /> I am a foreign national</label>
              <label className="text-xs font-semibold">Dual citizenship<input value={personal.dualCitizenship || ''} onChange={(event) => setPersonal('dualCitizenship', event.target.value)} className="mt-1 w-full px-3 py-2" /></label>
              <label className="text-xs font-semibold">Blood type<select value={personal.bloodType || ''} onChange={(event) => setPersonal('bloodType', event.target.value)} className="mt-1 w-full px-3 py-2"><option value="">Select</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option><option>Unknown</option></select></label>
              <label className="text-xs font-semibold">Height<input value={personal.height || ''} onChange={(event) => setPersonal('height', event.target.value)} placeholder="e.g. 165 cm" className="mt-1 w-full px-3 py-2" /></label>
              <label className="text-xs font-semibold">Weight<input value={personal.weight || ''} onChange={(event) => setPersonal('weight', event.target.value)} placeholder="e.g. 60 kg" className="mt-1 w-full px-3 py-2" /></label>
            </div>
          </section>

          <section id="student-classifications" className="student-form-section" aria-labelledby="student-classifications-heading">
            <h3 id="student-classifications-heading">Student Classifications</h3>
            <p className="mt-1 text-sm">Select all that apply. These flags do not change your academic standing or assigned program.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(['isShifter', 'isTransferee', 'isIP', 'isPWD'] as const).map((field) => (
                <label key={field} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={profile.classification?.[field] || false}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        classification: { ...current.classification, [field]: event.target.checked },
                      }))
                    }
                  />
                  {{ isShifter: 'Shifter', isTransferee: 'Transferee', isIP: 'Indigenous Peoples (IP)', isPWD: 'Person with Disability (PWD)' }[field]}
                </label>
              ))}
            </div>
          </section>

          <section id="student-enrollment" className="student-form-section" aria-labelledby="student-enrollment-heading">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div><h3 id="student-enrollment-heading">Enrollment Information</h3><p className="mt-1 text-xs">Assigned by the registrar or authorized academic staff.</p></div>
              <span className="self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">View only</span>
            </div>
            <dl className="mt-4 grid overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 sm:grid-cols-2">
              {[
                ['Degree program', assignedProgramLabel],
                ['Curriculum', enrollment.curriculum],
                ['Year level', enrollment.yearLevel || enrollment.level],
                ['Department', enrollment.department],
              ].map(([label, value]) => (
                <div key={label} className="border-b border-slate-200 px-4 py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-child(odd)]:border-r">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">{value || 'Not assigned yet'}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-slate-500">Contact the registrar if any assigned enrollment information is incorrect.</p>
          </section>

          <section id="student-contact" className="student-form-section" aria-labelledby="student-contact-heading">
            <h3 id="student-contact-heading">Contact Information</h3>
            <p className="mt-1 text-xs">Update the contact details the university may use to reach you.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><p className="text-xs font-semibold text-slate-700">Institutional email</p><div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">{institutionalEmail || 'Not linked to this account'}</div><p className="mt-1 text-[11px] text-slate-500">Managed through your institutional account.</p></div>
              <label className="text-xs font-semibold">Primary mobile number<input type="tel" inputMode="tel" autoComplete="tel" value={contact.mobileNumber || ''} onChange={(event) => setContext('contactInformation', 'mobileNumber', event.target.value)} placeholder="e.g. 0917 123 4567" className="mt-1 w-full px-3 py-2" /></label>
              <label className="text-xs font-semibold">Alternate mobile number <span className="font-normal text-slate-500">(optional)</span><input type="tel" inputMode="tel" value={contact.alternateMobileNumber || ''} onChange={(event) => setContext('contactInformation', 'alternateMobileNumber', event.target.value)} placeholder="Another reachable number" className="mt-1 w-full px-3 py-2" /></label>
              <label className="text-xs font-semibold">Telephone number <span className="font-normal text-slate-500">(optional)</span><input type="tel" inputMode="tel" value={contact.telephoneNumber || ''} onChange={(event) => setContext('contactInformation', 'telephoneNumber', event.target.value)} placeholder="Area code and number" className="mt-1 w-full px-3 py-2" /></label>
              <label className="text-xs font-semibold">Alternate email <span className="font-normal text-slate-500">(optional)</span><input type="email" autoComplete="email" value={contact.alternateEmail || ''} onChange={(event) => setContext('contactInformation', 'alternateEmail', event.target.value)} placeholder="Personal email address" className="mt-1 w-full px-3 py-2" /></label>
            </div>
          </section>

          <section id="student-education" className="student-form-section" aria-labelledby="student-education-heading">
            <h3 id="student-education-heading">Educational Background</h3>
            <p className="mt-1 text-xs">Provide your previous schools for student profiling and record verification.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold">Senior high school<input value={education.seniorHigh || ''} onChange={(event) => setContext('educationalBackground', 'seniorHigh', event.target.value)} placeholder="Full name of school" className="mt-1 w-full px-3 py-2" /></label>
              <label className="text-xs font-semibold">Previous college or university <span className="font-normal text-slate-500">(if applicable)</span><input value={education.previousSchool || ''} onChange={(event) => setContext('educationalBackground', 'previousSchool', event.target.value)} placeholder="For transferees or students with prior enrollment" className="mt-1 w-full px-3 py-2" /></label>
            </div>
          </section>

          <section id="student-health" className="student-form-section" aria-labelledby="student-health-heading">
            <h3 id="student-health-heading">Relevant Health Accommodations</h3>
            <p className="mt-1 text-xs">Only accommodation information necessary for academic evaluation may be shared with authorized faculty.</p>
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 shrink-0" checked={Boolean(health.hasRelevantHealthConcern)} onChange={(event) => setHealth('hasRelevantHealthConcern', event.target.checked)} /> I have a relevant health concern</label>
              {health.hasRelevantHealthConcern && <div className="p-4"><p className="text-xs font-semibold">Medical history: select all that apply</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{HEALTH_CONDITIONS.map((condition) => <label key={condition} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 shrink-0" checked={(health.conditions || []).includes(condition)} onChange={() => toggleCondition(condition)} /> {condition}</label>)}</div></div>}
              {(health.conditions || []).includes('Other') && <label className="block text-xs font-semibold">Other condition<textarea value={health.otherCondition || ''} onChange={(event) => setHealth('otherCondition', event.target.value)} className="mt-1 min-h-16 w-full px-3 py-2" /></label>}
              {(health.conditions || []).includes('Allergies') && <label className="block text-xs font-semibold">Allergy details<textarea value={health.allergyDetails || ''} onChange={(event) => setHealth('allergyDetails', event.target.value)} className="mt-1 min-h-16 w-full px-3 py-2" /></label>}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 shrink-0" checked={Boolean(health.accommodationRequired)} onChange={(event) => setHealth('accommodationRequired', event.target.checked)} /> I require an academic accommodation</label>
              <label className="block text-xs font-semibold">Accommodation notes<textarea value={health.accommodationNotes || ''} onChange={(event) => setHealth('accommodationNotes', event.target.value)} className="mt-1 min-h-20 w-full px-3 py-2" /></label>
              <label className="block text-xs font-semibold">Private condition description<textarea value={health.conditionDescription || ''} onChange={(event) => setHealth('conditionDescription', event.target.value)} className="mt-1 min-h-20 w-full px-3 py-2" /></label>
              <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold">Emergency contact name<input value={health.emergencyContactName || ''} onChange={(event) => setHealth('emergencyContactName', event.target.value)} className="mt-1 w-full px-3 py-2" /></label><label className="block text-xs font-semibold">Emergency contact number<input value={health.emergencyContactNumber || ''} onChange={(event) => setHealth('emergencyContactNumber', event.target.value)} className="mt-1 w-full px-3 py-2" /></label></div>
            </div>
          </section>

          <section id="student-address" className="student-form-section" aria-labelledby="student-address-heading">
            <h3 id="student-address-heading">Address Information</h3>
            <p className="mt-1 text-xs">Choose Philippine locations by region, province, municipality, and barangay. International addresses remain manually editable.</p>
            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              <AddressSelector title="Present address" address={addresses.presentAddress || {}} onChange={(field, value) => setAddress('presentAddress', field, value)} />
              <AddressSelector title="Home address" address={addresses.homeAddress || {}} onChange={(field, value) => setAddress('homeAddress', field, value)} />
            </div>
          </section>

          <section id="student-religion" className="student-form-section" aria-labelledby="student-religion-heading">
            <h3 id="student-religion-heading">Religious Information</h3>
            <p className="mt-1 text-xs">This is optional student-provided information. SAPES does not infer religion.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold">Religion or religious affiliation
                <select value={hasCustomReligion || isOtherReligion ? 'Other' : religion} onChange={(event) => { const value = event.target.value; setIsOtherReligion(value === 'Other'); setProfile((current) => ({ ...current, religiousInformation: { religion: value === 'Other' ? '' : value } })); }} className="mt-1 w-full px-3 py-2">
                  <option value="">Select an option</option>
                  {RELIGION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  <option value="Other">Other: specify</option>
                </select>
              </label>
              {(hasCustomReligion || isOtherReligion) && <label className="block text-xs font-semibold">Other religion or affiliation
                <input value={hasCustomReligion ? religion : ''} onChange={(event) => setProfile((current) => ({ ...current, religiousInformation: { religion: event.target.value } }))} placeholder="Optional" className="mt-1 w-full px-3 py-2" />
              </label>}
            </div>
            <div className="mt-4 p-4">
              <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 shrink-0" checked={Boolean(profile.religiousInformation?.shareSpiritualSchedule)} onChange={(event) => setProfile((current) => ({ ...current, religiousInformation: { ...current.religiousInformation, shareSpiritualSchedule: event.target.checked } }))} /> Share recurring unavailable times with faculty scheduling staff</label>
              <p className="mt-1 text-xs">Faculty see only unavailable times, never your religion or activity details.</p>
              {profile.religiousInformation?.shareSpiritualSchedule && <div className="mt-3 space-y-2">{(profile.religiousInformation.spiritualActivities || []).map((activity, index) => <div key={index} className="grid gap-2 sm:grid-cols-4"><select aria-label={`Unavailable day ${index + 1}`} value={activity.dayOfWeek} onChange={(event) => setActivities((profile.religiousInformation?.spiritualActivities || []).map((item, i) => i === index ? { ...item, dayOfWeek: event.target.value } : item))} className="px-2 py-1.5 text-xs"><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option></select><input aria-label={`Start time ${index + 1}`} type="time" value={activity.startTime} onChange={(event) => setActivities((profile.religiousInformation?.spiritualActivities || []).map((item, i) => i === index ? { ...item, startTime: event.target.value } : item))} className="px-2 py-1.5 text-xs" /><input aria-label={`End time ${index + 1}`} type="time" value={activity.endTime} onChange={(event) => setActivities((profile.religiousInformation?.spiritualActivities || []).map((item, i) => i === index ? { ...item, endTime: event.target.value } : item))} className="px-2 py-1.5 text-xs" /><button type="button" onClick={() => setActivities((profile.religiousInformation?.spiritualActivities || []).filter((_, i) => i !== index))} className="text-xs font-semibold" aria-label={`Remove unavailable time ${index + 1}`}>Remove</button></div>) }<button type="button" onClick={() => setActivities([...(profile.religiousInformation?.spiritualActivities || []), { dayOfWeek: 'Thursday', startTime: '18:00', endTime: '20:00' }])} className="text-xs font-bold">+ Add unavailable time</button></div>}
            </div>
          </section>

          <section className="student-readonly-note">
            <h3>System-controlled academic information</h3>
            <p className="mt-1">Academic status, grades, GWA, academic records, faculty evaluations, and status history are read-only and cannot be changed here.</p>
          </section>

          <div className="student-save-row">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white">
              Review profile
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
