import React, { useEffect, useState } from 'react';
import { Clapperboard, Cpu, Monitor, Utensils, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BackendStudentSearch } from './BackendStudentSearch';
import { fetchCourseEnrollmentSummary, CourseEnrollmentSummary } from '../../lib/api';
import { TECHNOLOGY_PROGRAMS } from '../../lib/academicPrograms';

const programDetails: Record<string, { description: string; icon: LucideIcon; accent: string }> = {
  'Bachelor of Information Technology': {
    description: 'Build software, networks, and digital systems for real-world needs.',
    icon: Monitor,
    accent: 'bg-sky-100 text-sky-800',
  },
  'Entertainment and Multimedia Computing': {
    description: 'Create interactive media, games, animation, and digital experiences.',
    icon: Clapperboard,
    accent: 'bg-rose-100 text-rose-800',
  },
  Electronics: {
    description: 'Study electronic systems, circuits, instrumentation, and applied technology.',
    icon: Cpu,
    accent: 'bg-amber-100 text-amber-800',
  },
  'Food Technology': {
    description: 'Explore food processing, quality, safety, and product development.',
    icon: Utensils,
    accent: 'bg-emerald-100 text-emerald-800',
  },
  'Automotive Technology': {
    description: 'Develop practical skills in vehicle systems, diagnostics, and service.',
    icon: Wrench,
    accent: 'bg-indigo-100 text-indigo-800',
  },
};

export const StudentSearchPage: React.FC = () => {
  const [summary, setSummary] = useState<CourseEnrollmentSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchCourseEnrollmentSummary()
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load enrollment totals.');
        }
      });

    return () => { cancelled = true; };
  }, []);

  const countByProgram = new Map(summary?.programs.map((item) => [item.program, item.count]) || []);

  return (
    <div className="space-y-7">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Faculty workspace</p>
        <div className="mt-1 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Student Search</h1>
            <p className="mt-1 text-sm text-slate-600">Find a student record or browse College of Technologies enrollment.</p>
          </div>
          <p className="text-sm font-semibold text-slate-600">
            {summary ? `${summary.totalActiveStudents} active student${summary.totalActiveStudents === 1 ? '' : 's'}` : 'Loading enrollment…'}
          </p>
        </div>
      </header>

      <BackendStudentSearch />

      <section aria-labelledby="technology-programs-heading">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">College of Technologies</p>
          <h2 id="technology-programs-heading" className="mt-1 text-xl font-extrabold text-slate-900">Programs</h2>
        </div>

        {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {summary && summary.unassignedCount > 0 && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {summary.unassignedCount} active student {summary.unassignedCount === 1 ? 'profile has' : 'profiles have'} no program recorded yet; those profiles are not included in course totals.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {TECHNOLOGY_PROGRAMS.map((program) => {
            const details = programDetails[program.value];
            const Icon = details.icon;
            const count = countByProgram.get(program.value);
            return (
              <article key={program.value} className="flex min-h-48 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${details.accent}`}>
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                    {count === undefined ? '—' : count} enrolled
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold leading-snug text-slate-900">{program.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{details.description}</p>
                <p className="mt-auto pt-4 text-xs font-semibold text-slate-500">
                  {count === undefined ? 'Enrollment total unavailable' : `${count} active student${count === 1 ? '' : 's'}`}
                </p>
              </article>
            );
          })}
        </div>

        {summary && (
          <section aria-labelledby="enrollment-follow-up-heading" className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-col justify-between gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center">
              <div>
                <h3 id="enrollment-follow-up-heading" className="text-sm font-bold text-slate-900">Enrollment follow-up</h3>
                <p className="mt-0.5 text-xs text-slate-500">Students who are not enrolled or whose enrollment is processing.</p>
              </div>
              <span className="text-xs font-semibold text-slate-600">
                {summary.pendingEnrollmentCount} student{summary.pendingEnrollmentCount === 1 ? '' : 's'} in this list
              </span>
            </div>

            {summary.pendingEnrollmentStudents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 font-bold">Student</th>
                      <th className="px-4 py-2.5 font-bold">Course</th>
                      <th className="px-4 py-2.5 font-bold">Year</th>
                      <th className="px-4 py-2.5 font-bold">Enrollment status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.pendingEnrollmentStudents.map((student) => (
                      <tr key={student.institutionId}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{student.name}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-slate-500">{student.institutionId}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {TECHNOLOGY_PROGRAMS.find((program) => program.value === student.program)?.label || student.program}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {student.yearLevel ? `${student.yearLevel}${student.yearLevel === 1 ? 'st' : student.yearLevel === 2 ? 'nd' : student.yearLevel === 3 ? 'rd' : 'th'} year` : 'Not recorded'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold ${student.enrollmentStatus === 'processing' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-800'}`}>
                            {student.enrollmentStatus === 'processing' ? 'Processing enrollment' : 'Not enrolled'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-4 py-5 text-sm text-slate-500">No students currently need enrollment follow-up.</p>
            )}
          </section>
        )}
      </section>
    </div>
  );
};