import React, { useEffect, useState } from 'react';
import { LayoutDashboard, UserCheck } from 'lucide-react';
import {
  fetchMyStudentIdentity,
  fetchMyStudentReport,
  StudentIdentity,
  StudentReport,
} from '../../lib/api';
import { BackendStudentWorkspace } from './BackendStudentWorkspace';
import { StudentProfileSetup } from './StudentProfileSetup';

export const StudentPortal: React.FC = () => {
  const [identity, setIdentity] = useState<StudentIdentity | null>(null);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'profile'>('overview');

  useEffect(() => {
    let active = true;
    Promise.all([fetchMyStudentIdentity(), fetchMyStudentReport()])
      .then(([student, studentReport]) => {
        if (!active) return;
        setIdentity(student);
        setReport(studentReport);
        const firstName = student.personalInformation?.firstName?.trim();
        const lastName = student.personalInformation?.lastName?.trim();
        if (!firstName || !lastName || (firstName === 'New' && lastName === 'Student')) {
          setActiveTab('profile');
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load student data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading your authenticated student profile…</div>;
  }

  if (error || !identity || !report) {
    return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">{error || 'Student profile not found.'}</div>;
  }

  const profileComplete = Boolean(
    identity.personalInformation?.firstName?.trim() &&
    identity.personalInformation?.lastName?.trim() &&
    !(identity.personalInformation.firstName === 'New' && identity.personalInformation.lastName === 'Student')
  );

  return (
    <div className="space-y-6">
      <div className="flex max-w-full items-center gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xs">
        <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${activeTab === 'overview' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
          <LayoutDashboard className="h-4 w-4" /> Profile & Academic Records
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
          <UserCheck className="h-4 w-4" /> Edit Student Profile
          {!profileComplete && <span className="h-2 w-2 rounded-full bg-amber-400" />}
        </button>
      </div>

      {activeTab === 'overview' && <BackendStudentWorkspace identity={identity} report={report} />}
      {activeTab === 'profile' && (
        <StudentProfileSetup
          identity={identity}
          isOnboarding={!profileComplete}
          onSaved={(updatedIdentity) => {
            setIdentity(updatedIdentity);
            setActiveTab('overview');
          }}
        />
      )}
    </div>
  );
};
