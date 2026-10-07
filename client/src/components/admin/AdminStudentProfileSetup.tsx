import React, { useEffect, useState } from 'react';
import { AddressSelector } from '../student/AddressSelector';
import {
  StudentIdentity,
  StudentProfileUpdate,
  updateStudentProfile,
} from '../../lib/api';
import { TECHNOLOGY_PROGRAMS } from '../../lib/academicPrograms';

interface AdminStudentProfileSetupProps {
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

export const AdminStudentProfileSetup: React.FC<AdminStudentProfileSetupProps> = ({
  identity,
  isOnboarding = false,
  onSaved,
}) => {
  const [profile, setProfile] = useState<StudentProfileUpdate>(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isOtherReligion, setIsOtherReligion] = useState(false);

  useEffect(() => {
    setProfile({
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
      classification: { ...identity.classification },
      enrollmentInformation: { ...identity.enrollmentInformation },
    });
    setIsOtherReligion(false);
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

  const setClassification = (field: keyof NonNullable<StudentProfileUpdate['classification']>, value: string | boolean) => {
    setProfile((current) => ({ ...current, classification: { ...current.classification, [field]: value } }));
  };

  const setEnrollment = (field: keyof NonNullable<StudentProfileUpdate['enrollmentInformation']>, value: string) => {
    setProfile((current) => ({ ...current, enrollmentInformation: { ...current.enrollmentInformation, [field]: value } }));
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
  const setActivities = (spiritualActivities: Array<{ dayOfWeek: string; startTime: string; endTime: string }>) => setProfile((current) => ({ ...current, religiousInformation: { ...current.religiousInformation, spiritualActivities } }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = Object.fromEntries(Object.entries(profile).filter(([, value]) =>
        value && typeof value === 'object' && Object.keys(value).length > 0
      )) as StudentProfileUpdate;
      const updatedIdentity = await updateStudentProfile(identity.institutionId, payload);
      onSaved(updatedIdentity);
      setMessage('Student profile saved successfully.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const personal = profile.personalInformation || {};
  const enrollment = profile.enrollmentInformation || {};
  const classification = profile.classification || {};
  const contact = profile.contactInformation || {};
  const education = profile.educationalBackground || {};
  const health = profile.healthInformation || {};
  const addresses = profile.addresses || {};
  const religion = profile.religiousInformation?.religion || '';
  const hasCustomReligion = Boolean(religion && !RELIGION_OPTIONS.includes(religion));
  const institutionalEmail = identity.contactInformation?.institutionalEmail || '';

  return (
    <div className="student-profile-layout">
      <nav className="student-profile-index" aria-label="Profile sections">
        <p>In your profile</p>
        <a href="#student-personal">Personal information</a>
        <a href="#student-enrollment">Enrollment information</a>
        <a href="#student-contact">Contact information</a>
        <a href="#student-education">Education background</a>
        <a href="#student-health">Health accommodations</a>
        <a href="#student-address">Addresses</a>
        <a href="#student-religion">Religious information</a>
      </nav>
      <form onSubmit={handleSubmit} className="student-profile-form">
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
          <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2"><input type="checkbox" checked={personal.isForeigner || false} onChange={(event) => setPersonal('isForeigner', event.target.checked)} /> I am a foreign national</label>
          <label className="text-xs font-semibold">Dual citizenship<input value={personal.dualCitizenship || ''} onChange={(event) => setPersonal('dualCitizenship', event.target.value)} className="mt-1 w-full px-3 py-2" /></label>
          <label className="text-xs font-semibold">Blood type<select value={personal.bloodType || ''} onChange={(event) => setPersonal('bloodType', event.target.value)} className="mt-1 w-full px-3 py-2"><option value="">Select</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option><option>Unknown</option></select></label>
          <label className="text-xs font-semibold">Height<input value={personal.height || ''} onChange={(event) => setPersonal('height', event.target.value)} placeholder="e.g. 165 cm" className="mt-1 w-full px-3 py-2" /></label>
          <label className="text-xs font-semibold">Weight<input value={personal.weight || ''} onChange={(event) => setPersonal('weight', event.target.value)} placeholder="e.g. 60 kg" className="mt-1 w-full px-3 py-2" /></label>
        </div>
      </section>

      <section id="student-enrollment" className="student-form-section" aria-labelledby="student-enrollment-heading">
        <h3 id="student-enrollment-heading">Enrollment Information</h3>
        <p className="mt-1 text-xs">Update the student's enrollment data.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold">Degree program<select value={enrollment.course || ''} onChange={(event) => setEnrollment('course', event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"><option value="">Select program...</option>{TECHNOLOGY_PROGRAMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
          <label className="text-xs font-semibold">Curriculum<input value={enrollment.curriculum || ''} onChange={(event) => setEnrollment('curriculum', event.target.value)} placeholder="e.g. 2023-2024" className="mt-1 w-full px-3 py-2" /></label>
          <label className="text-xs font-semibold">Year level<select value={enrollment.yearLevel || ''} onChange={(event) => setEnrollment('yearLevel', event.target.value)} className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm"><option value="">Select...</option><option value="1st Year">1st Year</option><option value="2nd Year">2nd Year</option><option value="3rd Year">3rd Year</option><option value="4th Year">4th Year</option><option value="5th Year">5th Year</option><option value="Irregular">Irregular</option></select></label>
          <label className="text-xs font-semibold">Department<input value={enrollment.department || ''} onChange={(event) => setEnrollment('department', event.target.value)} className="mt-1 w-full px-3 py-2" /></label>
        </div>
      </section>

      <section id="student-classifications" className="student-form-section" aria-labelledby="student-classifications-heading">
        <h3 id="student-classifications-heading">Classifications</h3>
        <p className="mt-1 text-xs">Update student demographics and flags.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold">Student type<select value={classification.studentType || ''} onChange={(event) => setClassification('studentType', event.target.value)} className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm"><option value="">Select...</option><option value="Regular">Regular</option><option value="Irregular">Irregular</option><option value="Returnee">Returnee</option></select></label>
          <label className="text-xs font-semibold">Indigenous group<input value={classification.indigenousGroup || ''} onChange={(event) => setClassification('indigenousGroup', event.target.value)} placeholder="If applicable" className="mt-1 w-full px-3 py-2" /></label>
          
          <div className="col-span-2 mt-2 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={classification.isIP || false} onChange={(event) => setClassification('isIP', event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" /> Indigenous Person (IP)</label>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={classification.isPWD || false} onChange={(event) => setClassification('isPWD', event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" /> Person with Disability (PWD)</label>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={classification.isShifter || false} onChange={(event) => setClassification('isShifter', event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" /> Shifter</label>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={classification.isTransferee || false} onChange={(event) => setClassification('isTransferee', event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" /> Transferee</label>
          </div>
        </div>
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
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(health.hasRelevantHealthConcern)} onChange={(event) => setHealth('hasRelevantHealthConcern', event.target.checked)} /> I have a relevant health concern</label>
          {health.hasRelevantHealthConcern && <div className="p-4"><p className="text-xs font-semibold">Medical history: select all that apply</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{HEALTH_CONDITIONS.map((condition) => <label key={condition} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={(health.conditions || []).includes(condition)} onChange={() => toggleCondition(condition)} /> {condition}</label>)}</div></div>}
          {(health.conditions || []).includes('Other') && <label className="block text-xs font-semibold">Other condition<textarea value={health.otherCondition || ''} onChange={(event) => setHealth('otherCondition', event.target.value)} className="mt-1 min-h-16 w-full px-3 py-2" /></label>}
          {(health.conditions || []).includes('Allergies') && <label className="block text-xs font-semibold">Allergy details<textarea value={health.allergyDetails || ''} onChange={(event) => setHealth('allergyDetails', event.target.value)} className="mt-1 min-h-16 w-full px-3 py-2" /></label>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(health.accommodationRequired)} onChange={(event) => setHealth('accommodationRequired', event.target.checked)} /> I require an academic accommodation</label>
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
          <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={Boolean(profile.religiousInformation?.shareSpiritualSchedule)} onChange={(event) => setProfile((current) => ({ ...current, religiousInformation: { ...current.religiousInformation, shareSpiritualSchedule: event.target.checked } }))} /> Share recurring unavailable times with faculty scheduling staff</label>
          <p className="mt-1 text-xs">Faculty see only unavailable times, never your religion or activity details.</p>
          {profile.religiousInformation?.shareSpiritualSchedule && <div className="mt-3 space-y-2">{(profile.religiousInformation.spiritualActivities || []).map((activity, index) => <div key={index} className="grid gap-2 sm:grid-cols-4"><select aria-label={`Unavailable day ${index + 1}`} value={activity.dayOfWeek} onChange={(event) => setActivities((profile.religiousInformation?.spiritualActivities || []).map((item, i) => i === index ? { ...item, dayOfWeek: event.target.value } : item))} className="px-2 py-1.5 text-xs"><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option></select><input aria-label={`Start time ${index + 1}`} type="time" value={activity.startTime} onChange={(event) => setActivities((profile.religiousInformation?.spiritualActivities || []).map((item, i) => i === index ? { ...item, startTime: event.target.value } : item))} className="px-2 py-1.5 text-xs" /><input aria-label={`End time ${index + 1}`} type="time" value={activity.endTime} onChange={(event) => setActivities((profile.religiousInformation?.spiritualActivities || []).map((item, i) => i === index ? { ...item, endTime: event.target.value } : item))} className="px-2 py-1.5 text-xs" /><button type="button" onClick={() => setActivities((profile.religiousInformation?.spiritualActivities || []).filter((_, i) => i !== index))} className="text-xs font-semibold" aria-label={`Remove unavailable time ${index + 1}`}>Remove</button></div>) }<button type="button" onClick={() => setActivities([...(profile.religiousInformation?.spiritualActivities || []), { dayOfWeek: 'Thursday', startTime: '18:00', endTime: '20:00' }])} className="text-xs font-bold">+ Add unavailable time</button></div>}
        </div>
      </section>

      <section className="student-readonly-note">
        <h3>System-controlled academic information</h3>
        <p className="mt-1">Academic status, grades, GWA, academic records, faculty evaluations, and status history are read-only and cannot be changed here.</p>
      </section>

      <div className="student-save-row">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white">{saving ? 'Saving...' : 'Save changes'}</button>
      </div>
    </form>
    </div>
  );
};
