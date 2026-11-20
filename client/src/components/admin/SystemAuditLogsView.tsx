import React, { useEffect, useState } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { ApiAuditLog, fetchAuditLogs } from '../../lib/api';
import { formatDate } from '../../utils/academicCalculators';

const categories = [
  'ALL',
  'SECURITY',
  'USER_MANAGEMENT',
  'ACADEMIC_RECORD',
  'FACULTY_EVALUATION',
  'PROFILE_UPDATE',
  'ENROLLMENT',
  'SYSTEM',
];

const categoryLabels: Record<string, string> = {
  ALL: 'All Activity',
  SECURITY: 'Security & Sign-In',
  USER_MANAGEMENT: 'User Management',
  ACADEMIC_RECORD: 'Academic Records',
  FACULTY_EVALUATION: 'Evaluations',
  PROFILE_UPDATE: 'Profile Updates',
  ENROLLMENT: 'Enrollment',
  SYSTEM: 'System & Settings',
};

const mapActionToCategory = (action: string): string => {
  switch (action) {
    case 'USER_LOGIN':
    case 'USER_LOGOUT':
    case 'LOGIN_RATE_LIMITED':
    case 'PASSWORD_CHANGED':
    case 'PASSWORD_RESET':
      return 'SECURITY';
    case 'STUDENT_ENROLLMENT_APPROVED':
      return 'ENROLLMENT';
    case 'COURSE_EVALUATION_UPDATED':
    case 'UPDATE_FACULTY_EVALUATION':
      return 'FACULTY_EVALUATION';
    case 'ROLE_PERMISSIONS_UPDATED':
    case 'SYSTEM_SETTINGS_UPDATED':
    case 'INTEGRATION_CREDENTIAL_CUSTOMIZED':
    case 'INTEGRATION_CREDENTIAL_RESET':
    case 'USER_CREATED':
    case 'USER_UPDATED':
    case 'USER_STATUS_UPDATED':
    case 'ACCOUNT_STATUS_UPDATED':
      return 'USER_MANAGEMENT';
    case 'UPDATE_STUDENT_STATUS':
    case 'ACADEMIC_RECORD_SAVED':
    case 'RECORD_LOCKED':
    case 'RECORD_UNLOCKED':
    case 'LOCK_CONFLICT':
    case 'ACADEMIC_PERIOD_SAVED':
    case 'EXPORT_STUDENT_REPORTS':
    case 'EXPORT_STUDENT_REPORTS_FAILED':
    case 'REPORT_MODIFIED':
      return 'ACADEMIC_RECORD';
    case 'UPDATE_STUDENT_CLASSIFICATION':
    case 'UPDATE_STUDENT_PROFILE':
    case 'STUDENT_PROFILE_UPDATED':
      return 'PROFILE_UPDATE';
    default:
      return 'SYSTEM';
  }
};

const getCategoryBadgeClass = (category: string) => {
  switch (category) {
    case 'SECURITY':
      return 'admin-badge-amber';
    case 'PROFILE_UPDATE':
      return 'admin-badge-green';
    case 'FACULTY_EVALUATION':
      return 'admin-badge-blue';
    case 'ACADEMIC_RECORD':
      return 'admin-badge-violet';
    case 'USER_MANAGEMENT':
      return 'admin-badge-navy';
    case 'ENROLLMENT':
      return 'admin-badge-blue';
    case 'SYSTEM':
    default:
      return 'admin-badge-navy';
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
    case 'TRANSACTION_RATE_LIMITED':
      return 'Rate Limit Triggered';
    case 'PASSWORD_CHANGED':
      return 'Password Changed';
    case 'PASSWORD_RESET':
      return 'Password Reset';
    case 'STUDENT_PROFILE_UPDATED':
      return 'Profile Updated';
    case 'UPDATE_STUDENT_CLASSIFICATION':
      return 'Classification Updated';
    case 'UPDATE_STUDENT_STATUS':
      return 'Academic Status Changed';
    case 'COURSE_EVALUATION_UPDATED':
    case 'UPDATE_FACULTY_EVALUATION':
      return 'Evaluation Submitted';
    case 'STUDENT_ENROLLMENT_APPROVED':
      return 'Enrollment Approved';
    case 'ROLE_PERMISSIONS_UPDATED':
      return 'Permissions Updated';
    case 'SYSTEM_SETTINGS_UPDATED':
      return 'Settings Updated';
    case 'INTEGRATION_CREDENTIAL_CUSTOMIZED':
      return 'API Credentials Customized';
    case 'INTEGRATION_CREDENTIAL_RESET':
      return 'API Credentials Reset';
    case 'ACADEMIC_PERIOD_SAVED':
      return 'Academic Period Updated';
    case 'ACADEMIC_RECORD_SAVED':
      return 'Academic Record Updated';
    case 'RECORD_LOCKED':
      return 'Record Locked';
    case 'RECORD_UNLOCKED':
      return 'Record Unlocked';
    case 'LOCK_CONFLICT':
      return 'Lock Conflict';
    case 'EXPORT_STUDENT_REPORTS':
      return 'Report Exported';
    case 'EXPORT_STUDENT_REPORTS_FAILED':
      return 'Report Export Failed';
    case 'REPORT_MODIFIED':
      return 'Report Modified';
    case 'USER_CREATED':
      return 'Account Provisioned';
    case 'USER_UPDATED':
      return 'Account Updated';
    case 'USER_STATUS_UPDATED':
    case 'ACCOUNT_STATUS_UPDATED':
      return 'Account Status Changed';
    default:
      return action
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

const formatAuditRecordDescription = (log: ApiAuditLog): string => {
  if (log.description) return log.description;
  const details = (log.details && typeof log.details === 'object' && !Array.isArray(log.details)
    ? log.details
    : {}) as Record<string, any>;
  const actor = log.userId?.username || 'User';

  switch (log.action) {
    case 'USER_LOGIN': {
      const dev = details.summary || (details.browser && details.os ? `${details.browser} on ${details.os}` : '');
      const ip = details.ip ? ` (${details.ip})` : '';
      const method = details.method === 'google' ? ' via Google authentication' : '';
      return `${actor} signed in to SAPES${dev ? ` from ${dev}` : ''}${ip}${method}.`;
    }
    case 'USER_LOGOUT': {
      const dev = details.summary || (details.browser && details.os ? `${details.browser} on ${details.os}` : '');
      const ip = details.ip ? ` (${details.ip})` : '';
      return `${actor} signed out of SAPES${dev ? ` from ${dev}` : ''}${ip}.`;
    }
    case 'LOGIN_RATE_LIMITED': {
      const ip = details.ip ? ` from IP ${details.ip}` : '';
      return `Account login was temporarily locked for 2 minutes${ip} due to excessive failed attempts.`;
    }
    case 'TRANSACTION_RATE_LIMITED': {
      const tx = details.transaction ? String(details.transaction).replace(/_/g, ' ').toLowerCase() : 'transaction';
      const ip = details.ip ? ` from IP ${details.ip}` : '';
      const retry = details.retryAfterSeconds ? ` for ${details.retryAfterSeconds}s` : '';
      return `Excessive requests on ${tx} blocked${retry}${ip} to protect system integrity.`;
    }
    case 'PASSWORD_CHANGED':
      return `${actor} changed their account password.`;
    case 'PASSWORD_RESET':
      return `${actor} successfully reset account password using email verification.`;
    case 'STUDENT_PROFILE_UPDATED': {
      const studentId = details.institutionId || log.userId?.username || 'student';
      return `Updated profile information for Student ${studentId}.`;
    }
    case 'UPDATE_STUDENT_CLASSIFICATION': {
      const studentId = details.institutionId || 'student';
      return `Updated classification details for Student ${studentId}.`;
    }
    case 'UPDATE_STUDENT_STATUS': {
      const studentId = details.institutionId ? ` for Student ${details.institutionId}` : '';
      const status = details.status ? ` to ${details.status}` : '';
      const reason = details.reason ? ` (${details.reason})` : '';
      return `Updated academic status${studentId}${status}${reason}.`;
    }
    case 'COURSE_EVALUATION_UPDATED':
    case 'UPDATE_FACULTY_EVALUATION': {
      const studentId = details.institutionId ? ` for Student ${details.institutionId}` : '';
      return `Submitted faculty course evaluation${studentId}.`;
    }
    case 'STUDENT_ENROLLMENT_APPROVED': {
      const studentId = details.institutionId ? ` for Student ${details.institutionId}` : '';
      return `Approved enrollment eligibility${studentId}.`;
    }
    case 'ROLE_PERMISSIONS_UPDATED':
      return `Administrator updated system access permissions for ${details.role || 'system roles'}.`;
    case 'SYSTEM_SETTINGS_UPDATED':
      return 'Administrator updated system integration configuration.';
    case 'INTEGRATION_CREDENTIAL_CUSTOMIZED':
      return `Administrator customized and verified API credentials for ${details.integration || 'external service'}.`;
    case 'INTEGRATION_CREDENTIAL_RESET':
      return `Administrator reverted API credentials for ${details.integration || 'external service'} to default (.env).`;
    case 'ACADEMIC_PERIOD_SAVED':
      return `Administrator configured academic term to AY ${details.schoolYear || ''} ${details.semester || ''}.`;
    case 'ACADEMIC_RECORD_SAVED': {
      const studentId = details.institutionId ? ` for Student ${details.institutionId}` : '';
      return `Updated academic subject grades and records${studentId}.`;
    }
    case 'EXPORT_STUDENT_REPORTS': {
      const rep = details.reportName || 'Overall Enrolled Students Report';
      const fmt = details.format ? String(details.format).toUpperCase() : 'CSV';
      const count = details.recordCount !== undefined ? ` (${details.recordCount} records)` : '';
      return `Administrator exported ${rep} in ${fmt} format${count}.`;
    }
    case 'EXPORT_STUDENT_REPORTS_FAILED': {
      const rep = details.reportName || 'Overall Enrolled Students Report';
      const fmt = details.format ? String(details.format).toUpperCase() : 'CSV';
      return `Export of ${rep} in ${fmt} format failed.`;
    }
    case 'REPORT_MODIFIED':
      return `Administrator modified ${details.reportName || 'report'} configuration.`;
    case 'RECORD_LOCKED': {
      const student = details.resourceId ? `Student ${details.resourceId}` : 'student record';
      const mode = details.lockMode === 'EXCLUSIVE' ? 'exclusive' : 'shared';
      return `${actor} acquired an ${mode} lock on ${student} (${details.leaseSeconds || 120}s lease).`;
    }
    case 'RECORD_UNLOCKED': {
      const student = details.resourceId ? `Student ${details.resourceId}` : 'student record';
      return `Lock on ${student} was released by ${actor}.`;
    }
    case 'LOCK_CONFLICT': {
      const student = details.resourceId ? `Student ${details.resourceId}` : 'student record';
      const heldBy = details.heldBy || 'another user';
      return `Concurrent access blocked on ${student}: record is actively locked by ${heldBy}.`;
    }
    case 'USER_CREATED':
      return `Administrator provisioned account for ${details.username || 'new user'} (${details.role || 'user'}).`;
    case 'USER_UPDATED':
      return `Administrator updated account details for ${details.username || 'user'}.`;
    case 'USER_STATUS_UPDATED':
    case 'ACCOUNT_STATUS_UPDATED':
      return `Administrator changed account status for ${details.username || 'user'} to ${details.accountStatus || 'updated'}.`;
    default:
      return `${actionToReadableTitle(log.action)} recorded on ${log.targetType || 'system'}.`;
  }
};

export const SystemAuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = async (targetPage = page, targetLimit = limit, targetCategory = categoryFilter, targetSearch = search) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAuditLogs({
        page: targetPage,
        limit: targetLimit,
        category: targetCategory !== 'ALL' ? targetCategory : undefined,
        search: targetSearch.trim() || undefined,
      });
      setLogs(data.auditLogs);
      setTotal(data.pagination.total);
      setTotalPages(Math.max(data.pagination.totalPages, 1));
      setPage(data.pagination.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load security audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadLogs(1, limit, categoryFilter, search);
    }, 250);
    return () => clearTimeout(timer);
  }, [categoryFilter, search, limit]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      void loadLogs(newPage, limit, categoryFilter, search);
    }
  };

  const exportLogsAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sapes-audit-logs-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="admin-page-stack" role="tabpanel">
      <section className="admin-panel admin-panel-body">
        <div className="admin-section-heading">
          <div className="flex items-start gap-3">
            <span className="admin-heading-icon"><ShieldCheck className="h-4 w-4" /></span>
            <div>
              <h2>System activities &amp; Security audit trail</h2>
              <p>Monitor relevant user actions, system modifications, permissions, and evaluation updates for accountability.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportLogsAsJson}
              disabled={loading || logs.length === 0}
              className="admin-secondary-button"
              title="Export current page audit entries to JSON"
            >
              <Download className="h-4 w-4" /> Export logs
            </button>
            <button
              type="button"
              onClick={() => void loadLogs(page, limit, categoryFilter, search)}
              disabled={loading}
              className="admin-secondary-button"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        {error && <p role="alert" className="admin-alert admin-alert-error mt-4">{error}</p>}
      </section>

      <section className="admin-panel admin-toolbar" aria-label="Audit trail filters">
        <div className="admin-search-control flex-1">
          <Search />
          <label htmlFor="admin-audit-search" className="sr-only">Search the security audit trail</label>
          <input
            id="admin-audit-search"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by action, target, actor, role, student ID..."
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="admin-status-control text-xs py-1 px-2"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <span className="admin-count whitespace-nowrap">
            <strong>{total}</strong> total recorded actions
          </span>
        </div>
      </section>

      <section className="admin-panel p-3 border-t-0 bg-slate-50/50">
        <div className="admin-filter-row" aria-label="Audit category">
          <Filter className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          <span className="text-xs font-semibold text-slate-600 mr-1">Category:</span>
          {categories.map((category) => (
            <button
              type="button"
              key={category}
              onClick={() => {
                setCategoryFilter(category);
                setPage(1);
              }}
              aria-pressed={categoryFilter === category}
              className={`admin-filter-button ${categoryFilter === category ? 'is-active' : ''}`}
            >
              {categoryLabels[category] || category.replaceAll('_', ' ')}
            </button>
          ))}
        </div>
      </section>

      <section className="admin-panel overflow-hidden">
        <div className="admin-table-wrap">
          <table className="admin-table" aria-label="Security audit records">
            <thead>
              <tr>
                <th>Time and date</th>
                <th>Actor</th>
                <th>Category</th>
                <th>Action</th>
                <th>Record</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => {
                const category = log.category || mapActionToCategory(log.action);
                const userName = log.userId?.username || log.actor || 'System';
                const userRole = log.userRole || log.userId?.role || 'admin';
                const readableAction = log.title || actionToReadableTitle(log.action);
                const readableRecord = formatAuditRecordDescription(log);

                return (
                  <tr key={log._id || `${log.timestamp}-${index}`}>
                    <td className="admin-mono whitespace-nowrap text-xs text-slate-600 font-medium">
                      {formatDate(log.timestamp)}
                    </td>
                    <td>
                      <span className="admin-table-primary">{userName}</span>
                      <span className="admin-table-secondary capitalize">{userRole}</span>
                    </td>
                    <td>
                      <span className={`admin-badge ${getCategoryBadgeClass(category)}`}>
                        {categoryLabels[category] || category.replaceAll('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className="font-semibold text-slate-800 text-xs">
                        {readableAction}
                      </span>
                    </td>
                    <td className="admin-audit-record py-3">
                      <div className="text-xs text-slate-700 leading-relaxed font-normal">
                        {readableRecord}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="admin-empty-state">
                    <Activity />
                    <strong>No audit entries found</strong>
                    <span>Change the search or category filter to view recorded activity.</span>
                  </td>
                </tr>
              )}
              {loading && logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="admin-empty-state">
                    <RefreshCw className="animate-spin" />
                    <strong>Loading audit records...</strong>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-pagination">
          <span>Page {page} of {totalPages} ({total} entries total)</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={loading || page <= 1}
              className="admin-secondary-button min-h-0 px-3 py-2"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={loading || page >= totalPages}
              className="admin-secondary-button min-h-0 px-3 py-2"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
