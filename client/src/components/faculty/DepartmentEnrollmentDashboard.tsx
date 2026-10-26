import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  RefreshCw,
  Search,
  UserRoundCheck,
} from 'lucide-react';
import campusBuilding from '../../assets/branding/cot building.jpg';
import {
  DepartmentEnrollmentDashboard as DepartmentStats,
  fetchDepartmentEnrollmentDashboard,
} from '../../lib/api';
import { TECHNOLOGY_PROGRAMS } from '../../lib/academicPrograms';
import type { FacultyPage } from '../../types';

interface DepartmentEnrollmentDashboardProps {
  facultyName: string;
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
  onNavigate,
}) => {
  const [department, setDepartment] = useState<DepartmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setDepartment(await fetchDepartmentEnrollmentDashboard());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load department enrollment metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') void loadDashboard(true);
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
      tone: 'bg-brand-50 text-brand-700',
      valueTone: 'text-slate-900',
    },
    {
      label: 'Profiles awaiting evaluation',
      value: department.profilesAwaitingEvaluation,
      detail: 'No faculty evaluation recorded',
      icon: ClipboardCheck,
      tone: 'bg-amber-50 text-amber-700',
      valueTone: 'text-amber-600',
    },
    {
      label: 'Pending enrollment decisions',
      value: department.pendingEnrollmentDecisions,
      detail: 'Awaiting an enrollment decision',
      icon: UserRoundCheck,
      tone: 'bg-sky-50 text-sky-700',
      valueTone: 'text-sky-700',
    },
    {
      label: 'Evaluated profiles',
      value: department.evaluatedProfiles,
      detail: 'Faculty evaluation recorded',
      icon: CheckCircle2,
      tone: 'bg-emerald-50 text-emerald-700',
      valueTone: 'text-emerald-700',
    },
  ] : [];

  const programLabel = department
    ? TECHNOLOGY_PROGRAMS.find((program) => program.value === department.program)?.label || department.program
    : '';
  const firstName = facultyName.trim().split(/\s+/)[0];

  return (
    <div className="space-y-5">
      <header className="grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex min-h-32 flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-7">
          <div>
          <p className="text-xs font-semibold text-brand-700">Faculty overview</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Good day, {firstName}!</h1>
          <p className="mt-1 text-sm text-slate-600">
            {department
              ? `Here’s an overview of your ${department.name} students and academic progress.`
              : 'Your assigned department enrollment and evaluation overview.'}
          </p>
          {department && (
            <p className="mt-3 inline-flex rounded-md bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
              {programLabel}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void loadDashboard(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} />
          Refresh dashboard
        </button>
        </div>
        <img src={campusBuilding} alt="College of Technologies campus building" className="hidden h-full min-h-32 w-full object-cover md:block" />
      </header>

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
          <section aria-label={`${department.name} dashboard metrics`} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ label, value, detail, icon: Icon, tone, valueTone }) => (
              <article key={label} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="max-w-40 text-xs font-semibold leading-5 text-slate-600">{label}</p>
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone}`}>
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                </div>
                <p className={`mt-2 text-3xl font-extrabold ${valueTone}`}>{value}</p>
                <p className="mt-1 text-xs text-slate-500">{detail}</p>
              </article>
            ))}
          </section>

          <p className="rounded-lg border border-brand-100 bg-brand-50/70 px-4 py-3 text-xs leading-5 text-brand-900">
            All figures are for active {department.name} students only. Evaluation and enrollment counts are tracked separately, so a student may appear in both.
          </p>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
            <section aria-labelledby="recent-students-heading" className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
                <div>
                  <h2 id="recent-students-heading" className="text-sm font-bold text-slate-900">Recent students</h2>
                  <p className="mt-1 text-xs text-slate-500">Recently updated profiles in your department.</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('student-search')}
                  className="shrink-0 text-xs font-semibold text-brand-700 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                >
                  View all students
                </button>
              </div>
              {department.recentStudents.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-slate-500">No active students are assigned to this department yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[570px] text-left">
                    <thead className="bg-slate-50">
                      <tr className="text-[10px] font-bold text-slate-600">
                        <th scope="col" className="px-4 py-3">Student ID</th>
                        <th scope="col" className="px-4 py-3">Name</th>
                        <th scope="col" className="px-4 py-3">Course</th>
                        <th scope="col" className="px-4 py-3">Year</th>
                        <th scope="col" className="px-4 py-3">Enrollment status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {department.recentStudents.map((student) => (
                        <tr key={student.institutionId} className="border-t border-slate-100">
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
              <section aria-labelledby="quick-actions-heading" className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 id="quick-actions-heading" className="text-sm font-bold text-slate-900">Quick actions</h2>
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('student-search')}
                    className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-50 text-brand-700"><Search aria-hidden="true" className="h-4 w-4" /></span>
                    Search department students
                    <ArrowRight aria-hidden="true" className="ml-auto h-3.5 w-3.5 text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('evaluations')}
                    className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-md bg-indigo-50 text-indigo-700"><ClipboardCheck aria-hidden="true" className="h-4 w-4" /></span>
                    Evaluate academic standing
                    <ArrowRight aria-hidden="true" className="ml-auto h-3.5 w-3.5 text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('student-records')}
                    className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-md bg-sky-50 text-sky-700"><BookOpen aria-hidden="true" className="h-4 w-4" /></span>
                    View academic records
                    <ArrowRight aria-hidden="true" className="ml-auto h-3.5 w-3.5 text-slate-400" />
                  </button>
                </div>
              </section>

              <section aria-labelledby="recent-evaluations-heading" className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <Clock3 aria-hidden="true" className="h-4 w-4 text-slate-500" />
                  <h2 id="recent-evaluations-heading" className="text-sm font-bold text-slate-900">Recent evaluations</h2>
                </div>
                {department.recentEvaluations.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-500">No evaluations have been recorded for this department.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-slate-100">
                    {department.recentEvaluations.map((evaluation) => (
                      <li key={`${evaluation.institutionId}-${evaluation.evaluatedAt}`} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-800">{evaluation.name}</p>
                          <p className="mt-1 font-mono text-[10px] text-slate-500">{evaluation.institutionId}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-semibold ${evaluationStatusClass(evaluation.evaluationStatus)}`}>
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
