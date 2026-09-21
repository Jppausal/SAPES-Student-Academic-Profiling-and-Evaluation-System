import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { fetchMyStudentIdentity, fetchMyStudentReport, StudentIdentity, StudentReport } from '../../lib/api';
import { BackendStudentWorkspace } from './BackendStudentWorkspace';
import { StudentOverview } from './StudentOverview';
import { StudentProfileForm } from './StudentProfileForm';
import { StudentAcademicRecordView } from './StudentAcademicRecordView';
import { StudentDossierSummary } from './StudentDossierSummary';
import {
  LayoutDashboard,
  UserCheck,
  GraduationCap,
  FileText,
  Sparkles,
} from 'lucide-react';

export const StudentPortal: React.FC = () => {
  const { currentStudentProfile } = useApp();
  const [identity, setIdentity] = useState<StudentIdentity | null>(null);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'academics' | 'summary'>(
    'overview'
  );

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(fetchMyStudentIdentity)
      .then(async (student) => {
        const studentReport = await fetchMyStudentReport();
        if (active) {
          setIdentity(student);
          setReport(studentReport);
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

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 shadow-xs max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard Overview
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Student Profiling Form
          {currentStudentProfile?.profileCompletionPercentage !== 100 && (
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('academics')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'academics'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Academic Record & Major GWA
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'summary'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          Official Profiling Dossier
        </button>
      </div>

      {/* Main Tab Render */}
      {(activeTab === 'overview' || activeTab === 'academics') && (
        <BackendStudentWorkspace identity={identity} report={report} />
      )}

      {activeTab === 'profile' && (
        <StudentProfileForm
          onSavedCallback={() => {
            // Optional callback
          }}
        />
      )}

      {activeTab === 'academics' && <StudentAcademicRecordView />}

      {activeTab === 'summary' && <StudentDossierSummary />}
    </div>
  );
};
