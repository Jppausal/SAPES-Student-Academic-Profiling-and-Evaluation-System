import React from 'react';
import { GraduationCap, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BackendStudentSearch } from './BackendStudentSearch';

export const FacultyPortal: React.FC = () => {
  const { currentUser } = useApp();

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-5 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:p-8 md:flex-row md:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-indigo-200">
            <ShieldCheck className="h-4 w-4" /> Authorized Faculty Workspace
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Student Academic Evaluation</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Search the shared student record, review recorded subjects and major-subject GWA, submit an evaluation, and preserve academic status history.
          </p>
          <p className="mt-2 text-xs text-slate-400">Signed in as {currentUser?.fullName || currentUser?.username || 'Faculty user'}</p>
        </div>
        <GraduationCap className="hidden h-16 w-16 text-indigo-300 md:block" />
      </section>

      <BackendStudentSearch />
    </div>
  );
};
