import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Globe,
  GraduationCap,
  Laptop,
  Lock,
  RefreshCw,
  ShieldCheck,
  User,
  UserCheck
} from 'lucide-react';
import { ApiAuditLog, fetchMyAuditLogs } from '../../lib/api';

const CATEGORIES = [
  { id: 'all', label: 'All Activity' },
  { id: 'security', label: 'Security & Sign-In' },
  { id: 'profile', label: 'Profile Updates' },
  { id: 'academic', label: 'Academic Status' },
  { id: 'enrollment', label: 'Enrollment' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

const actionLabel = (action: string) =>
  action
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const targetLabel = (targetType: string) =>
  targetType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (timestamp: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(timestamp));
  } catch {
    return timestamp;
  }
};

const sectionLabels: Record<string, string> = {
  personalInformation: 'Personal information',
  enrollmentInformation: 'Enrollment information',
  contactInformation: 'Contact information',
  addresses: 'Addresses',
  educationalBackground: 'Educational background',
  healthInformation: 'Health information',
  classification: 'Student classification',
  religiousInformation: 'Religious information',
};

const getUpdatedSections = (details: ApiAuditLog['details']) => {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return [];
  const record = details as Record<string, unknown>;
  const sections = record.updatedSections || record.updatedFields;
  if (!Array.isArray(sections)) return [];
  return sections
    .filter((section): section is string => typeof section === 'string')
    .map((section) => sectionLabels[section] || targetLabel(section));
};

const getFallbackAuditTitle = (log: ApiAuditLog) => {
  const updatedSections = getUpdatedSections(log.details);
  if (updatedSections.length > 0) {
    return `Updated ${updatedSections.join(', ')}`;
  }
  return actionLabel(log.action);
};

const getFallbackAuditDescription = (log: ApiAuditLog) => {
  const updatedSections = getUpdatedSections(log.details);
  if (updatedSections.length > 0) {
    return 'Student profile information';
  }
  return `${targetLabel(log.targetType)} activity`;
};

const getCategoryIconTile = (category?: string, isSecuritySensitive?: boolean) => {
  if (isSecuritySensitive || category === 'Security') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 shadow-2xs dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60">
        <ShieldCheck size={18} />
      </div>
    );
  }
  if (category === 'Academic') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 shadow-2xs dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60">
        <GraduationCap size={18} />
      </div>
    );
  }
  if (category === 'Enrollment') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/70 shadow-2xs dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60">
        <UserCheck size={18} />
      </div>
    );
  }
  if (category === 'Profile') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/70 shadow-2xs dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60">
        <User size={18} />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 border border-slate-200/70 shadow-2xs dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
      <Clock3 size={18} />
    </div>
  );
};

const renderCategoryBadge = (log: ApiAuditLog) => {
  const isSecurity = log.isSecuritySensitive || log.category === 'Security';
  if (isSecurity) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
        <Lock size={10} className="text-amber-600 dark:text-amber-400" /> Security
      </span>
    );
  }
  if (log.category === 'Academic') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800 border border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
        <GraduationCap size={11} className="text-emerald-600 dark:text-emerald-400" /> Academic
      </span>
    );
  }
  if (log.category === 'Profile') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-800 border border-blue-200/70 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60">
        <User size={11} className="text-blue-600 dark:text-blue-400" /> Profile
      </span>
    );
  }
  if (log.category === 'Enrollment') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-800 border border-indigo-200/70 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60">
        <UserCheck size={11} className="text-indigo-600 dark:text-indigo-400" /> Enrollment
      </span>
    );
  }
  if (log.category) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
        <Clock3 size={11} className="text-slate-500 dark:text-slate-400" /> {log.category}
      </span>
    );
  }
  return null;
};

export const StudentAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = async (requestedPage = page, category = activeCategory) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchMyAuditLogs(requestedPage, 20, category);
      setLogs(result.auditLogs);
      setPage(result.pagination.page);
      setTotalPages(Math.max(result.pagination.totalPages, 1));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load your audit history.');
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
    <section className="student-audit-page" aria-labelledby="student-audit-heading">
      {/* Header Row */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/70 pb-5 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700 border border-brand-200/60 shadow-2xs dark:from-brand-950 dark:to-brand-900 dark:text-brand-300 dark:border-brand-800">
            <Activity size={22} />
          </div>
          <div>
            <h2 id="student-audit-heading" className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Account Activity History
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              A clear, human-readable record of actions, profile changes, and sign-ins on your account.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadLogs(page, activeCategory)}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:border-slate-300 active:scale-95 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100/80 p-1 border border-slate-200/60 dark:bg-slate-800/80 dark:border-slate-700/60">
        {CATEGORIES.map(({ id, label }) => {
          const isActive = activeCategory === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleCategoryChange(id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-white text-brand-900 shadow-2xs border border-slate-200/80 dark:bg-slate-700 dark:text-white dark:border-slate-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/50'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {loading && (
        <div role="status" className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <RefreshCw className="mb-3 h-6 w-6 animate-spin text-brand-600 dark:text-brand-400" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Loading your activity history...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div role="alert" className="mb-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-2xs border border-slate-200/60 dark:bg-slate-800 dark:border-slate-700">
            <ShieldCheck size={24} className="text-brand-600 dark:text-brand-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">No activity recorded yet</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {activeCategory === 'all'
              ? 'Actions related to your account such as sign-ins and profile updates will appear here.'
              : `No activity found under "${CATEGORIES.find((c) => c.id === activeCategory)?.label}".`}
          </p>
        </div>
      )}

      {/* Activity Timeline List */}
      {!loading && !error && logs.length > 0 && (
        <>
          <div className="space-y-3">
            {logs.map((log) => {
              const title = log.title || getFallbackAuditTitle(log);
              const description = log.description || getFallbackAuditDescription(log);
              const isSecurity = log.isSecuritySensitive || log.category === 'Security';

              return (
                <article
                  key={log._id || `${log.action}-${log.timestamp}`}
                  className={`group relative flex items-start gap-3.5 rounded-xl border p-4 transition-all duration-150 ${
                    isSecurity
                      ? 'border-amber-200/80 bg-gradient-to-r from-amber-50/25 to-transparent hover:border-amber-300 hover:bg-amber-50/35 dark:border-amber-900/40 dark:bg-amber-950/10'
                      : 'border-slate-200/70 bg-white hover:border-slate-300 hover:bg-slate-50/50 hover:shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                  }`}
                >
                  {getCategoryIconTile(log.category, log.isSecuritySensitive)}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {title}
                        </h3>
                        {renderCategoryBadge(log)}
                      </div>
                      <time
                        dateTime={log.timestamp}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500"
                      >
                        <Clock3 size={11} className="text-slate-400 dark:text-slate-500" />
                        {formatDate(log.timestamp)}
                      </time>
                    </div>

                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {description}
                    </p>

                    {/* Metadata Badges: Actor, Device, IP */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                      {log.actor && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200/70 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700">
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          By {log.actor}
                        </span>
                      )}
                      {log.deviceInfo?.summary && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-normal text-slate-600 border border-slate-200/70 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700">
                          <Laptop size={12} className="text-slate-400" />
                          {log.deviceInfo.summary}
                        </span>
                      )}
                      {log.deviceInfo?.ip && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-normal text-slate-500 border border-slate-200/70 font-mono dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700">
                          <Globe size={12} className="text-slate-400" />
                          {log.deviceInfo.ip}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-slate-200/70 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => void loadLogs(page - 1, activeCategory)}
                disabled={page <= 1 || loading}
                aria-label="Previous page"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-40 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => void loadLogs(page + 1, activeCategory)}
                disabled={page >= totalPages || loading}
                aria-label="Next page"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-40 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};
