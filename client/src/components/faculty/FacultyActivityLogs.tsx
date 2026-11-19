import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileCheck2,
  GraduationCap,
  History,
  KeyRound,
  Lock,
  LogOut,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
} from 'lucide-react';
import { ApiAuditLog, fetchMyAuditLogs } from '../../lib/api';

const CATEGORIES = [
  { id: 'all', label: 'All Activity' },
  { id: 'security', label: 'Security & Sign-In' },
  { id: 'academic', label: 'Evaluations & Records' },
  { id: 'enrollment', label: 'Enrollment' },
  { id: 'profile', label: 'Account & Profile' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

const formatDate = (timestamp: string) => {
  try {
    const d = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return timestamp;
  }
};

const actionToReadableTitle = (action: string): string => {
  switch (action) {
    case 'USER_LOGIN':
      return 'Sign In';
    case 'USER_LOGOUT':
      return 'Sign Out';
    case 'LOGIN_RATE_LIMITED':
      return 'Spam Login Lockout';
    case 'PASSWORD_CHANGED':
      return 'Password Changed';
    case 'PASSWORD_RESET':
      return 'Password Reset';
    case 'COURSE_EVALUATION_UPDATED':
    case 'UPDATE_FACULTY_EVALUATION':
      return 'Evaluation Submitted';
    case 'STUDENT_ENROLLMENT_APPROVED':
      return 'Enrollment Approved';
    case 'ACADEMIC_RECORD_SAVED':
      return 'Academic Record Saved';
    case 'UPDATE_STUDENT_STATUS':
      return 'Academic Status Updated';
    case 'EXPORT_STUDENT_REPORTS':
      return 'Report Exported';
    case 'USER_UPDATED':
      return 'Account Updated';
    default:
      return action
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

const getFallbackAuditDescription = (log: ApiAuditLog): string => {
  if (log.description) return log.description;
  const details = (log.details && typeof log.details === 'object' && !Array.isArray(log.details)
    ? log.details
    : {}) as Record<string, any>;

  switch (log.action) {
    case 'USER_LOGIN':
      return 'You signed in to your SAPES faculty account.';
    case 'USER_LOGOUT':
      return 'You signed out of your SAPES faculty account.';
    case 'LOGIN_RATE_LIMITED':
      return 'Account sign-in was temporarily locked for 2 minutes due to excessive failed attempts.';
    case 'COURSE_EVALUATION_UPDATED':
    case 'UPDATE_FACULTY_EVALUATION':
      return details.institutionId
        ? `You submitted a student course evaluation for Student ${details.institutionId}.`
        : 'You submitted a student course evaluation.';
    case 'STUDENT_ENROLLMENT_APPROVED':
      return details.institutionId
        ? `You approved enrollment for Student ${details.institutionId}.`
        : 'You approved student enrollment.';
    case 'ACADEMIC_RECORD_SAVED':
      return details.institutionId
        ? `You updated academic records for Student ${details.institutionId}.`
        : 'You updated academic records.';
    case 'UPDATE_STUDENT_STATUS':
      return details.institutionId
        ? `You updated academic status for Student ${details.institutionId}.`
        : 'You updated student academic status.';
    case 'PASSWORD_CHANGED':
      return 'Your account password was successfully changed.';
    default:
      return `Activity recorded: ${actionToReadableTitle(log.action)}.`;
  }
};

const getCategoryBadge = (log: ApiAuditLog) => {
  const isSecurity = log.isSecuritySensitive || log.category === 'Security';

  if (isSecurity) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200/80">
        <Lock className="h-3 w-3 text-amber-600" /> Security
      </span>
    );
  }
  if (log.category === 'Academic') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200/80">
        <GraduationCap className="h-3 w-3 text-emerald-600" /> Academic
      </span>
    );
  }
  if (log.category === 'Enrollment') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-800 border border-indigo-200/80">
        <UserCheck className="h-3 w-3 text-indigo-600" /> Enrollment
      </span>
    );
  }
  if (log.category === 'Profile') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800 border border-sky-200/80">
        <User className="h-3 w-3 text-sky-600" /> Account
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
      <Clock className="h-3 w-3 text-slate-500" /> {log.category || 'General'}
    </span>
  );
};

export const FacultyActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = async (requestedPage = page, category = activeCategory) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchMyAuditLogs(requestedPage, 15, category);
      setLogs(result.auditLogs);
      setPage(result.pagination.page);
      setTotalPages(Math.max(result.pagination.totalPages, 1));
      setTotalCount(result.pagination.total || result.auditLogs.length);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load your activity history.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs(1, activeCategory);
  }, [activeCategory]);

  const handleCategoryChange = (category: CategoryId) => {
    if (category === activeCategory) return;
    setActiveCategory(category);
    setPage(1);
  };

  return (
    <section className="mx-auto max-w-6xl px-2 py-4 sm:px-4" aria-labelledby="faculty-audit-heading">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
        {/* Header Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 border border-brand-200/80 shadow-2xs">
              <History className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="faculty-audit-heading" className="text-lg font-bold tracking-tight text-slate-900">
                  Faculty Activity History
                </h2>
                {totalCount > 0 && !loading && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                    {totalCount} events
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Human-readable record of actions, evaluations, enrollments, and security events from your account.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadLogs(page, activeCategory)}
            disabled={loading}
            className="inline-flex items-center gap-2 self-start sm:self-auto rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:border-slate-300 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="my-5 flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100/90 p-1.5 border border-slate-200/70">
          {CATEGORIES.map(({ id, label }) => {
            const isActive = activeCategory === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleCategoryChange(id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-brand-900 shadow-2xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {loading && (
          <div role="status" className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
            <RefreshCw className="mb-3 h-6 w-6 animate-spin text-brand-600" />
            <p className="text-xs font-medium text-slate-600">Loading your activity history...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div role="alert" className="mb-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadLogs(page, activeCategory)}
              className="ml-auto font-semibold underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-2xs border border-slate-200">
              <ShieldCheck className="h-6 w-6 text-brand-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No activity recorded yet</h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
              {activeCategory === 'all'
                ? 'Actions you perform such as signing in, evaluating students, and updating records will appear here.'
                : `No activity found under "${CATEGORIES.find((c) => c.id === activeCategory)?.label}".`}
            </p>
          </div>
        )}

        {/* 5-Column Audit Table: Time and date | Actor | Category | Action | Record */}
        {!loading && !error && logs.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs" aria-label="Faculty activity log">
              <thead className="bg-slate-50/90 text-slate-700">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">
                    Time and date
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">
                    Actor
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">
                    Action
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">
                    Record
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {logs.map((log) => {
                  const title = log.title || actionToReadableTitle(log.action);
                  const description = getFallbackAuditDescription(log);
                  const actor = log.actor || 'You';

                  return (
                    <tr
                      key={log._id || `${log.action}-${log.timestamp}`}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      {/* 1. Time and date */}
                      <td className="px-4 py-3.5 font-mono text-slate-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {formatDate(log.timestamp)}
                        </span>
                      </td>

                      {/* 2. Actor */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{actor}</span>
                      </td>

                      {/* 3. Category */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getCategoryBadge(log)}
                      </td>

                      {/* 4. Action */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-900">{title}</span>
                      </td>

                      {/* 5. Record */}
                      <td className="px-4 py-3.5 text-slate-700 leading-relaxed max-w-xl">
                        <p className="text-xs font-normal">{description}</p>
                        {log.deviceInfo?.summary && (
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            <span>{log.deviceInfo.summary}</span>
                            {log.deviceInfo.ip && <span>• IP: {log.deviceInfo.ip}</span>}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && !error && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => void loadLogs(page - 1, activeCategory)}
              disabled={page <= 1 || loading}
              aria-label="Previous page"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-40 active:scale-95"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>

            <span className="text-xs font-medium text-slate-500">
              Page <span className="font-bold text-slate-800">{page}</span> of <span className="font-bold text-slate-800">{totalPages}</span>
            </span>

            <button
              type="button"
              onClick={() => void loadLogs(page + 1, activeCategory)}
              disabled={page >= totalPages || loading}
              aria-label="Next page"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-40 active:scale-95"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
