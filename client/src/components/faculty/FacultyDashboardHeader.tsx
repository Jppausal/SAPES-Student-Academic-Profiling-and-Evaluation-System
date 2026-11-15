import React from 'react';
import { IdCard } from 'lucide-react';
import dashboardHeader from '../../assets/branding/dashboard-header.png';

interface FacultyDashboardHeaderProps {
  facultyName: string;
  facultyId?: string;
  department?: string;
}

export const FacultyDashboardHeader: React.FC<FacultyDashboardHeaderProps> = ({
  facultyName,
  facultyId,
  department,
}) => {
  const firstName = facultyName.trim().split(/\s+/)[0] || 'Faculty';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <header
      className="relative isolate overflow-hidden rounded-2xl border border-brand-800 bg-brand-900 shadow-lg"
      style={{ backgroundImage: `url("${dashboardHeader}")`, backgroundPosition: 'right center', backgroundSize: 'auto 100%' }}
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-950 via-brand-900/95 to-brand-900/25" aria-hidden="true" />
      <div className="absolute inset-y-0 right-[34%] -z-10 w-32 skew-x-[-22deg] bg-brand-600/25" aria-hidden="true" />
      <div className="absolute inset-y-0 right-[28%] -z-10 w-12 skew-x-[-22deg] bg-brand-300/20" aria-hidden="true" />
      <div className="absolute inset-y-0 right-[22%] -z-10 w-6 skew-x-[-22deg] bg-white/10" aria-hidden="true" />

      <div className="relative flex min-h-48 items-center px-6 py-7 sm:px-10 sm:py-8">
        <div className="max-w-2xl">
          <span className="mb-4 block h-1 w-12 rounded-full bg-amber-400" aria-hidden="true" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {greeting}, <span className="text-blue-300">Prof. {firstName}!</span>
          </h1>
          <p className="mt-2 text-sm text-blue-50 sm:text-base">
            Here&apos;s an overview of your faculty activities and student records.
          </p>
          <div className="mt-5 inline-flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/10 bg-brand-950/55 px-3 py-2 text-xs font-semibold text-blue-50 backdrop-blur-sm">
            <span className="inline-flex items-center gap-2">
              <IdCard className="h-4 w-4 text-white" aria-hidden="true" />
              Faculty ID: {facultyId || 'Not assigned'}
            </span>
            <span className="hidden h-4 w-px bg-white/30 sm:block" aria-hidden="true" />
            <span>Department: {department || 'Not assigned'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
