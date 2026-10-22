import React, { useEffect, useState } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { ApiAuditLog, fetchAuditLogs } from '../../lib/api';
import { formatDate } from '../../utils/academicCalculators';
import { Modal } from '../common/Modal';

const categories = [
  'ALL',
  'USER_MANAGEMENT',
  'ACADEMIC_RECORD',
  'FACULTY_EVALUATION',
  'PROFILE_UPDATE',
  'SYSTEM',
];

const mapActionToCategory = (action: string): string => {
  switch (action) {
    case 'COURSE_EVALUATION_UPDATED':
    case 'UPDATE_FACULTY_EVALUATION':
      return 'FACULTY_EVALUATION';
    case 'ROLE_PERMISSIONS_UPDATED':
    case 'SYSTEM_SETTINGS_UPDATED':
    case 'USER_CREATED':
    case 'USER_UPDATED':
    case 'USER_STATUS_UPDATED':
    case 'ACCOUNT_STATUS_UPDATED':
      return 'USER_MANAGEMENT';
    case 'UPDATE_STUDENT_STATUS':
    case 'ACADEMIC_RECORD_SAVED':
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
    case 'PROFILE_UPDATE':
      return 'admin-badge-green';
    case 'FACULTY_EVALUATION':
      return 'admin-badge-blue';
    case 'ACADEMIC_RECORD':
      return 'admin-badge-violet';
    case 'USER_MANAGEMENT':
      return 'admin-badge-amber';
    case 'SYSTEM':
    default:
      return 'admin-badge-navy';
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
  const [selectedLog, setSelectedLog] = useState<ApiAuditLog | null>(null);

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
            placeholder="Search by action, target, actor, role..."
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
              {category.replaceAll('_', ' ')}
            </button>
          ))}
        </div>
      </section>

      <section className="admin-panel overflow-hidden">
        <div className="admin-table-wrap">
          <table className="admin-table" aria-label="Security audit records">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor / User</th>
                <th>Category</th>
                <th>Action</th>
                <th>Target &amp; Details</th>
                <th className="text-right">Inspect</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => {
                const category = mapActionToCategory(log.action);
                const userName = log.userId?.username || 'System';
                const userRole = log.userRole || log.userId?.role || 'admin';
                const detailsStr = typeof log.details === 'object' && log.details !== null
                  ? JSON.stringify(log.details)
                  : String(log.details || '');

                return (
                  <tr key={log._id || `${log.timestamp}-${index}`}>
                    <td className="admin-mono whitespace-nowrap text-[11px] text-slate-600">
                      {formatDate(log.timestamp)}
                    </td>
                    <td>
                      <span className="admin-table-primary">{userName}</span>
                      <span className="admin-table-secondary capitalize">{userRole}</span>
                    </td>
                    <td>
                      <span className={`admin-badge ${getCategoryBadgeClass(category)}`}>
                        {category.replaceAll('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-navy admin-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="admin-audit-detail max-w-md">
                      {log.targetType && (
                        <div className="admin-audit-target admin-mono text-xs">
                          Target: {log.targetType} {log.targetId ? `(${log.targetId})` : ''}
                        </div>
                      )}
                      <div className="text-xs text-slate-600 line-clamp-1 truncate" title={detailsStr}>
                        {detailsStr}
                      </div>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="admin-icon-button"
                        title="Inspect full audit log entry"
                        aria-label={`Inspect audit log for ${log.action}`}
                      >
                        <Eye className="w-4 h-4 text-slate-600 hover:text-indigo-600" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="admin-empty-state">
                    <Activity />
                    <strong>No audit entries found</strong>
                    <span>Change the search or category filter to view recorded activity.</span>
                  </td>
                </tr>
              )}
              {loading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="admin-empty-state">
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

      {/* Log Details Modal */}
      {selectedLog && (
        <Modal
          isOpen={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title="Security Audit Activity Details"
          subtitle={`Action: ${selectedLog.action} on ${selectedLog.targetType}`}
          maxWidth="2xl"
          actions={
            <div className="flex w-full justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="admin-secondary-button"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <span className="text-slate-500 block mb-0.5">Actor</span>
                <span className="font-semibold text-slate-900 text-sm">
                  {selectedLog.userId?.username || 'System User'}
                </span>
                <span className="block text-slate-500 text-[11px] capitalize mt-0.5">
                  Role: {selectedLog.userRole || selectedLog.userId?.role || 'admin'} ({selectedLog.userModel || 'AdminUser'})
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <span className="text-slate-500 block mb-0.5">Recorded Timestamp</span>
                <span className="font-semibold text-slate-900 text-sm admin-mono">
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </span>
                <span className="block text-slate-500 text-[11px] mt-0.5">
                  ISO: {selectedLog.timestamp}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-md border border-slate-200 p-2.5 bg-white">
                <span className="text-slate-500 block mb-0.5">Action Code</span>
                <span className="font-mono font-medium text-slate-900 text-sm">
                  {selectedLog.action}
                </span>
              </div>
              <div className="rounded-md border border-slate-200 p-2.5 bg-white">
                <span className="text-slate-500 block mb-0.5">Target</span>
                <span className="font-mono font-medium text-slate-900 text-sm">
                  {selectedLog.targetType} {selectedLog.targetId ? `· ID: ${selectedLog.targetId}` : ''}
                </span>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Structured Event Details &amp; Payload
              </h5>
              <div className="rounded-lg border border-slate-200 bg-slate-950 p-3.5 text-xs font-mono text-emerald-400 overflow-x-auto max-h-72">
                <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
