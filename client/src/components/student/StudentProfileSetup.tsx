import React, { useEffect, useState } from 'react';
import { CheckCircle2, Save, ShieldCheck } from 'lucide-react';
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

const emptyProfile: StudentProfileUpdate = {
  personalInformation: {},
  classification: {},
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

  useEffect(() => {
    setProfile({
      personalInformation: { ...identity.personalInformation },
      classification: { ...identity.classification },
      religiousInformation: { ...identity.religiousInformation },
    });
  }, [identity]);

  const setPersonal = (field: keyof NonNullable<StudentProfileUpdate['personalInformation']>, value: string | boolean) => {
    setProfile((current) => ({
      ...current,
      personalInformation: { ...current.personalInformation, [field]: value },
    }));
  };

  const setClassification = (field: keyof NonNullable<StudentProfileUpdate['classification']>, value: string | boolean) => {
    setProfile((current) => ({
      ...current,
      classification: { ...current.classification, [field]: value },
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const updatedIdentity = await updateMyStudentProfile(profile);
      onSaved(updatedIdentity);
      setMessage('Your student profile was saved successfully.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const personal = profile.personalInformation || {};
  const classification = profile.classification || {};

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
          <label className="text-xs font-semibold text-slate-700">Birth date<input type="date" value={personal.birthDate ? String(personal.birthDate).slice(0, 10) : ''} onChange={(event) => setPersonal('birthDate', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" /></label>
          <label className="text-xs font-semibold text-slate-700">Birth place<input value={personal.birthPlace || ''} onChange={(event) => setPersonal('birthPlace', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" /></label>
          <label className="text-xs font-semibold text-slate-700">Sex<input value={personal.sex || ''} onChange={(event) => setPersonal('sex', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" /></label>
          <label className="text-xs font-semibold text-slate-700">Civil status<input value={personal.civilStatus || ''} onChange={(event) => setPersonal('civilStatus', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" /></label>
          <label className="text-xs font-semibold text-slate-700">Nationality<input value={personal.nationality || ''} onChange={(event) => setPersonal('nationality', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" /></label>
          <label className="text-xs font-semibold text-slate-700">Citizenship<input value={personal.citizenship || ''} onChange={(event) => setPersonal('citizenship', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" /></label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 sm:col-span-2"><input type="checkbox" checked={personal.isForeigner || false} onChange={(event) => setPersonal('isForeigner', event.target.checked)} /> I am a foreign national</label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="font-bold text-slate-900">Student Classification</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">Student type<input value={classification.studentType || ''} onChange={(event) => setClassification('studentType', event.target.value)} placeholder="e.g. regular, shifter, transferee" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" /></label>
          <label className="text-xs font-semibold text-slate-700">Indigenous group<input value={classification.indigenousGroup || ''} onChange={(event) => setClassification('indigenousGroup', event.target.value)} disabled={!classification.isIP} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 disabled:bg-slate-100" /></label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={classification.isIP || false} onChange={(event) => setClassification('isIP', event.target.checked)} /> I identify as Indigenous Peoples (IP)</label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={classification.isPWD || false} onChange={(event) => setClassification('isPWD', event.target.checked)} /> I identify as a Person with Disability (PWD)</label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="font-bold text-slate-900">Religious Information</h2>
        <p className="mt-1 text-xs text-slate-500">This is optional student-provided information. SAPES does not infer religion.</p>
        <label className="mt-4 block text-xs font-semibold text-slate-700">Religion or religious affiliation<input value={profile.religiousInformation?.religion || ''} onChange={(event) => setProfile((current) => ({ ...current, religiousInformation: { religion: event.target.value } }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" /></label>
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