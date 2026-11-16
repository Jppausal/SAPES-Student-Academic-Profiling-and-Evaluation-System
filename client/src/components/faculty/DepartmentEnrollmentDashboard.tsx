import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Users,
  UserRoundCheck,
} from 'lucide-react';
import { FacultyDashboardHeader } from './FacultyDashboardHeader';
import {
  DepartmentEnrollmentDashboard as DepartmentStats,
  fetchDepartmentEnrollmentDashboard,
} from '../../lib/api';
import { TECHNOLOGY_PROGRAMS } from '../../lib/academicPrograms';
import type { FacultyPage } from '../../types';

interface DepartmentEnrollmentDashboardProps {
  facultyName: string;
  facultyId?: string;
  departmentName?: string;
  onNavigate: (page: FacultyPage) => void;
}

const formatStatus = (status: string) =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatEnrollmentStatus = (status: string) => {
  if (status === 'enrolled') return 'Approved';
  if (status === 'processing') return 'Processing';
  return 'Pending';
};

const enrollmentStatusClass = (status: string) => {
  if (status === 'enrolled') return 'bg-emerald-50 text-emerald-700';
  if (status === 'processing') return 'bg-sky-50 text-sky-700';
  return 'bg-amber-50 text-amber-700';
};

const evaluationStatusClass = (status: string) => {
  if (status === 'eligible') return 'bg-emerald-50 text-emerald-700';
  if (status === 'not_eligible') return 'bg-rose-50 text-rose-700';
  return 'bg-amber-50 text-amber-700';
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const DepartmentEnrollmentDashboard: React.FC<DepartmentEnrollmentDashboardProps> = ({
  facultyName,
  facultyId,
  departmentName,
  onNavigate,
}) => {
  const [department, setDepartment] = useState<DepartmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDepartment(await fetchDepartmentEnrollmentDashboard());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load department enrollment metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') void loadDashboard();
    };
    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, [loadDashboard]);

  const cards = department ? [
    {
      label: 'Total students',
      value: department.totalStudents,
      detail: 'Active profiles in your department',
      icon: GraduationCap,
      tone: 'bg-blue-100 text-blue-700',
      ghostTone: 'text-blue-100',
      borderTone: 'border-blue-500',
      valueTone: 'text-slate-900',
    },
    {
      label: 'Profiles awaiting evaluation',
      value: department.profilesAwaitingEvaluation,
      detail: 'No faculty evaluation recorded',
      icon: ClipboardCheck,
      tone: 'bg-blue-100 text-blue-700',
      ghostTone: 'text-blue-100',
      borderTone: 'border-amber-500',
      valueTone: 'text-amber-600',
    },
    {
      label: 'Pending enrollment decisions',
      value: department.pendingEnrollmentDecisions,
      detail: 'Awaiting an enrollment decision',
      icon: UserRoundCheck,
      tone: 'bg-blue-100 text-blue-700',
      ghostTone: 'text-blue-100',
      borderTone: 'border-brand-600',
      valueTone: 'text-sky-700',
    },
    {
      label: 'Evaluated profiles',
      value: department.evaluatedProfiles,
      detail: 'Faculty evaluation recorded',
      icon: CheckCircle2,
      tone: 'bg-blue-100 text-blue-700',
      ghostTone: 'text-blue-100',
      borderTone: 'border-emerald-600',
      valueTone: 'text-emerald-700',
    },
  ] : [];

  const programLabel = department
    ? TECHNOLOGY_PROGRAMS.find((program) => program.value === department.program)?.label || department.program
    : '';
  return (
    <div className="space-y-5">
      <FacultyDashboardHeader
        facultyName={facultyName}
        facultyId={facultyId}
        department={departmentName || programLabel}
      />

      {loading && (
        <p role="status" className="rounded-lg border border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-500">
          Loading department dashboard…
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {!loading && department && (
        <>
          <section aria-label={`${department.name} dashboard metrics`} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ label, value, detail, icon: Icon, tone, ghostTone, borderTone, valueTone }) => (
              <article key={label} className={`relative min-h-[150px] overflow-hidden rounded-2xl border border-slate-200 border-b-4 ${borderTone} bg-white px-5 py-4 shadow-sm`}>
                <Icon aria-hidden="true" className={`pointer-events-none absolute -bottom-2 -right-2 h-20 w-20 ${ghostTone}`} />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-brand-900">{label}</p>
                    <p className={`mt-2 text-3xl font-extrabold tracking-tight ${valueTone}`}>{value}</p>
                  </div>
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}>
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                </div>
                <p className="relative mt-3 text-[11px] font-semibold text-slate-500">{detail}</p>
              </article>
            ))}
          </section>

          <p className="rounded-lg border border-brand-100 bg-brand-50/70 px-4 py-3 text-xs leading-5 text-brand-900">
            All figures are for active {department.name} students only. Evaluation and enrollment counts are tracked separately, so a student may appear in both.
          </p>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
            <section aria-labelledby="recent-students-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-900 text-white">
                    <Users className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 id="recent-students-heading" className="text-base font-extrabold text-brand-900">Recent Students</h2>
                    <p className="mt-1 text-xs text-slate-500">Recently updated profiles and evaluations.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('student-search')}
                  className="shrink-0 text-xs font-bold text-brand-700 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                >
                  View all students <ArrowRight className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              {department.recentStudents.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-slate-500">No active students are assigned to this department yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[570px] text-left">
                    <thead className="bg-brand-50/70">
                      <tr className="text-[10px] font-bold text-brand-800">
                        <th scope="col" className="px-4 py-3">Student ID</th>
                        <th scope="col" className="px-4 py-3">Name</th>
                        <th scope="col" className="px-4 py-3">Course</th>
                        <th scope="col" className="px-4 py-3">Year</th>
                        <th scope="col" className="px-4 py-3">Enrollment status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {department.recentStudents.map((student) => (
                        <tr key={student.institutionId} className="border-t border-slate-100 hover:bg-brand-50/40">
                          <td className="px-4 py-3 font-mono text-[10px] text-slate-600">{student.institutionId}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-slate-800">{student.name}</td>
                          <td className="px-4 py-3 text-xs text-slate-600">{department.code}</td>
                          <td className="px-4 py-3 text-xs text-slate-600">{student.yearLevel || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-semibold ${enrollmentStatusClass(student.enrollmentStatus)}`}>
                              {formatEnrollmentStatus(student.enrollmentStatus)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="space-y-4">
              <section aria-labelledby="recent-evaluations-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-900 text-white">
                    <ClipboardCheck aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 id="recent-evaluations-heading" className="text-base font-extrabold text-brand-900">Recent Evaluations</h2>
                    <p className="mt-1 text-xs text-slate-500">Latest student evaluation activity.</p>
                  </div>
                </div>
                {department.recentEvaluations.length === 0 ? (
                  <p className="px-5 py-6 text-xs text-slate-500">No evaluations have been recorded for this department.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {department.recentEvaluations.map((evaluation) => (
                      <li key={`${evaluation.institutionId}-${evaluation.evaluatedAt}`} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-brand-50/40">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-brand-900">{evaluation.name}</p>
                          <p className="mt-1 font-mono text-[10px] text-slate-500">{evaluation.institutionId}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${evaluationStatusClass(evaluation.evaluationStatus)}`}>
                            {formatStatus(evaluation.evaluationStatus)}
                          </span>
                          <p className="mt-1 text-[10px] text-slate-500">{formatDate(evaluation.evaluatedAt)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>

          <p className="text-right text-[11px] text-slate-500">
            Last synchronized: {department.lastSyncedAt ? new Date(department.lastSyncedAt).toLocaleString() : 'Just now'}
          </p>
        </>
      )}
    </div>
  );
};
