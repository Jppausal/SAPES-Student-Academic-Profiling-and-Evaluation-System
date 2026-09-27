import React, { useEffect, useState } from 'react';
import { CheckCircle2, Save, ShieldCheck } from 'lucide-react';
import { AddressSelector } from './AddressSelector';
import {
  StudentIdentity,
  StudentProfileUpdate,
  updateMyStudentProfile,
} from '../../lib/api';

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

  useEffect(() => {
    setProfile({
      personalInformation: { ...identity.personalInformation },
      religiousInformation: { ...identity.religiousInformation },
      enrollmentInformation: { ...identity.enrollmentInformation },
      contactInformation: { ...identity.contactInformation },
      educationalBackground: { ...identity.educationalBackground },
      addresses: { presentAddress: { ...identity.addresses?.presentAddress }, homeAddress: { ...identity.addresses?.homeAddress } },
      healthInformation: { ...identity.healthInformation },
    });
    setIsOtherReligion(false);
  }, [identity]);

  const setPersonal = (field: keyof NonNullable<StudentProfileUpdate['personalInformation']>, value: string | boolean) => {
    setProfile((current) => ({
      ...current,
      personalInformation: { ...current.personalInformation, [field]: value },
    }));
  };


  const setContext = (section: 'enrollmentInformation' | 'contactInformation' | 'educationalBackground', field: string, value: string) => {
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
      const updatedIdentity = await updateMyStudentProfile(payload);
      onSaved(updatedIdentity);
      setMessage('Your student profile was saved successfully.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const personal = profile.personalInformation || {};
  const enrollment = profile.enrollmentInformation || {};
  const contact = profile.contactInformation || {};
  const education = profile.educationalBackground || {};
  const health = profile.healthInformation || {};
  const addresses = profile.addresses || {};
  const religion = profile.religiousInformation?.religion || '';
  const hasCustomReligion = Boolean(religion && !RELIGION_OPTIONS.includes(religion));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-700" />
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">
              {isOnboarding ? 'Complete Your Student Profile' : 'Student Profile Information'}
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Provide and maintain the profile information authorized SAPES faculty may need during academic evaluation. Your institution ID and academic records are system-controlled.
            </p>
          </div>
        </div>
      </section>

      {message && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800"><CheckCircle2 className="h-4 w-4" />{message}</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="font-bold text-slate-900">Personal Information</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">Institution ID <input value={identity.institutionId} readOnly className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 font-mono text-slate-500" /></label>
          <label className="text-xs font-semibold text-slate-700">First name *<input required value={personal.firstName || ''} onChange={(event) => setPersonal('firstName', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" /></label>
          <label className="text-xs font-semibold text-slate-700">Middle name<input value={personal.middleName || ''} onChange={(event) => setPersonal('middleName', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" /></label>
          <label className="text-xs font-semibold text-slate-700">Last name *<input required value={personal.lastName || ''} onChange={(event) => setPersonal('lastName', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" /></label>
          <label className="text-xs font-semibold text-slate-700">Suffix<input placeholder="Jr., Sr., III" value={personal.suffix || ''} onChange={(event) => setPersonal('suffix', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" /></label>
          <label className="text-xs font-semibold text-slate-700">Birth date<input type="date" value={personal.birthDate ? String(personal.birthDate).slice(0, 10) : ''} onChange={(event) => setPersonal('birthDate', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" /></label>
          <label className="text-xs font-semibold text-slate-700">Birth place<input value={personal.birthPlace || ''} onChange={(event) => setPersonal('birthPlace', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" /></label>
          <label className="text-xs font-semibold text-slate-700">Sex<select value={personal.sex || ''} onChange={(event) => setPersonal('sex', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"><option value="">Select</option><option>Female</option><option>Male</option><option>Prefer not to say</option></select></label>
          <label className="text-xs font-semibold text-slate-700">Civil status<select value={personal.civilStatus || ''} onChange={(event) => setPersonal('civilStatus', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"><option value="">Select</option><option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option></select></label>
          <label className="text-xs font-semibold text-slate-700">Nationality<input value={personal.nationality || ''} onChange={(event) => setPersonal('nationality', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" /></label>
          <label className="text-xs font-semibold text-slate-700">Citizenship<input value={personal.citizenship || ''} onChange={(event) => setPersonal('citizenship', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" /></label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 sm:col-span-2"><input type="checkbox" checked={personal.isForeigner || false} onChange={(event) => setPersonal('isForeigner', event.target.checked)} /> I am a foreign national</label>
          <label className="text-xs font-semibold text-slate-700">Dual citizenship<input value={personal.dualCitizenship || ''} onChange={(event) => setPersonal('dualCitizenship', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" /></label>
          <label className="text-xs font-semibold text-slate-700">Blood type<select value={personal.bloodType || ''} onChange={(event) => setPersonal('bloodType', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"><option value="">Select</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option><option>Unknown</option></select></label>
          <label className="text-xs font-semibold text-slate-700">Height<input value={personal.height || ''} onChange={(event) => setPersonal('height', event.target.value)} placeholder="e.g. 165 cm" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" /></label>
          <label className="text-xs font-semibold text-slate-700">Weight<input value={personal.weight || ''} onChange={(event) => setPersonal('weight', event.target.value)} placeholder="e.g. 60 kg" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" /></label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="font-bold text-slate-900">Academic and Contact Context</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">Course<input value={enrollment.course || ''} onChange={(event) => setContext('enrollmentInformation', 'course', event.target.value)} placeholder="e.g. Bachelor of Science in Information Technology" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
          <label className="text-xs font-semibold text-slate-700">Curriculum<input value={enrollment.curriculum || ''} onChange={(event) => setContext('enrollmentInformation', 'curriculum', event.target.value)} placeholder="e.g. 2024-2025 BSIT" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
          <label className="text-xs font-semibold text-slate-700">Year level<input value={enrollment.yearLevel || ''} onChange={(event) => setContext('enrollmentInformation', 'yearLevel', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
          <label className="text-xs font-semibold text-slate-700">Department<input value={enrollment.department || ''} onChange={(event) => setContext('enrollmentInformation', 'department', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
          <label className="text-xs font-semibold text-slate-700">Institutional email<input type="email" value={contact.institutionalEmail || ''} onChange={(event) => setContext('contactInformation', 'institutionalEmail', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
          <label className="text-xs font-semibold text-slate-700">Mobile number<input value={contact.mobileNumber || ''} onChange={(event) => setContext('contactInformation', 'mobileNumber', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
          <label className="text-xs font-semibold text-slate-700">Senior high school<input value={education.seniorHigh || ''} onChange={(event) => setContext('educationalBackground', 'seniorHigh', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
          <label className="text-xs font-semibold text-slate-700">Previous school<input value={education.previousSchool || ''} onChange={(event) => setContext('educationalBackground', 'previousSchool', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
        <h2 className="font-bold text-slate-900">Relevant Health Accommodations</h2>
        <p className="mt-1 text-xs text-slate-600">Only accommodation information necessary for academic evaluation may be shared with authorized faculty.</p>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={Boolean(health.hasRelevantHealthConcern)} onChange={(event) => setHealth('hasRelevantHealthConcern', event.target.checked)} /> I have a relevant health concern</label>
          {health.hasRelevantHealthConcern && <div className="rounded-xl border border-amber-200 bg-white p-4"><p className="text-xs font-semibold text-slate-700">Medical history — select all that apply</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{HEALTH_CONDITIONS.map((condition) => <label key={condition} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={(health.conditions || []).includes(condition)} onChange={() => toggleCondition(condition)} /> {condition}</label>)}</div></div>}
          {(health.conditions || []).includes('Other') && <label className="block text-xs font-semibold text-slate-700">Other condition<textarea value={health.otherCondition || ''} onChange={(event) => setHealth('otherCondition', event.target.value)} className="mt-1 min-h-16 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>}
          {(health.conditions || []).includes('Allergies') && <label className="block text-xs font-semibold text-slate-700">Allergy details<textarea value={health.allergyDetails || ''} onChange={(event) => setHealth('allergyDetails', event.target.value)} className="mt-1 min-h-16 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>}
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={Boolean(health.accommodationRequired)} onChange={(event) => setHealth('accommodationRequired', event.target.checked)} /> I require an academic accommodation</label>
          <label className="block text-xs font-semibold text-slate-700">Accommodation notes<textarea value={health.accommodationNotes || ''} onChange={(event) => setHealth('accommodationNotes', event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
          <label className="block text-xs font-semibold text-slate-700">Private condition description<textarea value={health.conditionDescription || ''} onChange={(event) => setHealth('conditionDescription', event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-700">Emergency contact name<input value={health.emergencyContactName || ''} onChange={(event) => setHealth('emergencyContactName', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label><label className="block text-xs font-semibold text-slate-700">Emergency contact number<input value={health.emergencyContactNumber || ''} onChange={(event) => setHealth('emergencyContactNumber', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label></div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="font-bold text-slate-900">Address Information</h2>
        <p className="mt-1 text-xs text-slate-500">Choose Philippine locations by region, province, municipality, and barangay. International addresses remain manually editable.</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <AddressSelector title="Present address" address={addresses.presentAddress || {}} onChange={(field, value) => setAddress('presentAddress', field, value)} />
          <AddressSelector title="Home address" address={addresses.homeAddress || {}} onChange={(field, value) => setAddress('homeAddress', field, value)} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="font-bold text-slate-900">Religious Information</h2>
        <p className="mt-1 text-xs text-slate-500">This is optional student-provided information. SAPES does not infer religion.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-700">Religion or religious affiliation
            <select value={hasCustomReligion || isOtherReligion ? 'Other' : religion} onChange={(event) => { const value = event.target.value; setIsOtherReligion(value === 'Other'); setProfile((current) => ({ ...current, religiousInformation: { religion: value === 'Other' ? '' : value } })); }} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900">
              <option value="">Select an option</option>
              {RELIGION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              <option value="Other">Other — specify</option>
            </select>
          </label>
          {(hasCustomReligion || isOtherReligion) && <label className="block text-xs font-semibold text-slate-700">Other religion or affiliation
            <input value={hasCustomReligion ? religion : ''} onChange={(event) => setProfile((current) => ({ ...current, religiousInformation: { religion: event.target.value } }))} placeholder="Optional" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" />
          </label>}
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={Boolean(profile.religiousInformation?.shareSpiritualSchedule)} onChange={(event) => setProfile((current) => ({ ...current, religiousInformation: { ...current.religiousInformation, shareSpiritualSchedule: event.target.checked } }))} /> Share recurring unavailable times with faculty scheduling staff</label>
          <p className="mt-1 text-xs text-slate-500">Faculty see only unavailable times, never your religion or activity details.</p>
          {profile.religiousInformation?.shareSpiritualSchedule && <div className="mt-3 space-y-2">{(profile.religiousInformation.spiritualActivities || []).map((activity, index) => <div key={index} className="grid gap-2 sm:grid-cols-4"><select value={activity.dayOfWeek} onChange={(event) => setActivities((profile.religiousInformation?.spiritualActivities || []).map((item, i) => i === index ? { ...item, dayOfWeek: event.target.value } : item))} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option></select><input type="time" value={activity.startTime} onChange={(event) => setActivities((profile.religiousInformation?.spiritualActivities || []).map((item, i) => i === index ? { ...item, startTime: event.target.value } : item))} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs" /><input type="time" value={activity.endTime} onChange={(event) => setActivities((profile.religiousInformation?.spiritualActivities || []).map((item, i) => i === index ? { ...item, endTime: event.target.value } : item))} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs" /><button type="button" onClick={() => setActivities((profile.religiousInformation?.spiritualActivities || []).filter((_, i) => i !== index))} className="text-xs font-semibold text-rose-700">Remove</button></div>) }<button type="button" onClick={() => setActivities([...(profile.religiousInformation?.spiritualActivities || []), { dayOfWeek: 'Thursday', startTime: '18:00', endTime: '20:00' }])} className="text-xs font-bold text-indigo-700">+ Add unavailable time</button></div>}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs text-slate-600">
        <h2 className="font-bold text-slate-900">System-controlled academic information</h2>
        <p className="mt-1">Academic status, grades, GWA, academic records, faculty evaluations, and status history are read-only and cannot be changed here.</p>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Changes'}</button>
      </div>
    </form>
  );
};
