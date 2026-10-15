import React, { useState } from 'react';
import { Filter, Search, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SystemAuditLog } from '../../types';
import { formatDate } from '../../utils/academicCalculators';

const categories = ['ALL', 'SYSTEM', 'PROFILE_UPDATE', 'FACULTY_EVALUATION', 'ACADEMIC_RECORD', 'USER_MANAGEMENT'];

const getCategoryBadgeClass = (category: SystemAuditLog['category']) => {
  switch (category) {
    case 'PROFILE_UPDATE': return 'admin-badge-green';
    case 'FACULTY_EVALUATION': return 'admin-badge-blue';
    case 'ACADEMIC_RECORD': return 'admin-badge-violet';
    case 'USER_MANAGEMENT': return 'admin-badge-amber';
    case 'SYSTEM':
    default: return 'admin-badge-navy';
  }
};

export const SystemAuditLogsView: React.FC = () => {
  const { auditLogs } = useApp();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filteredLogs = auditLogs.filter((log) => {
    const query = search.toLowerCase();
    const matchesSearch = !query
      || log.action.toLowerCase().includes(query)
      || log.userName.toLowerCase().includes(query)
      || log.details.toLowerCase().includes(query);
    return matchesSearch && (categoryFilter === 'ALL' || log.category === categoryFilter);
  });

  return (
    <div className="admin-page-stack" role="tabpanel">
      <section className="admin-panel admin-panel-body">
        <div className="admin-section-heading">
          <div className="flex items-start gap-3">
            <span className="admin-heading-icon"><ShieldCheck className="h-4 w-4" /></span>
            <div><h2>Security audit trail</h2><p>Review recorded system activity by actor, category, action, and target.</p></div>
          </div>
          <span className="admin-count"><strong>{filteredLogs.length}</strong> of {auditLogs.length} entries</span>
        </div>
      </section>

      <section className="admin-panel admin-toolbar" aria-label="Audit trail filters">
        <div className="admin-search-control">
          <Search />
          <label htmlFor="admin-audit-search" className="sr-only">Search the security audit trail</label>
          <input id="admin-audit-search" type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by user, action, or details" />
        </div>
        <div className="admin-filter-row" aria-label="Audit category">
          <Filter className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          {categories.map((category) => <button
            type="button"
            key={category}
            onClick={() => setCategoryFilter(category)}
            aria-pressed={categoryFilter === category}
            className={`admin-filter-button ${categoryFilter === category ? 'is-active' : ''}`}
          >{category.replaceAll('_', ' ')}</button>)}
        </div>
      </section>

      <section className="admin-panel overflow-hidden">
        <div className="admin-table-wrap">
          <table className="admin-table" aria-label="Security audit records">
            <thead><tr><th>Timestamp</th><th>Actor / User</th><th>Category</th><th>Action</th><th>Target and details</th></tr></thead>
            <tbody>
              {filteredLogs.map((log) => <tr key={log.id}>
                <td className="admin-mono whitespace-nowrap text-[11px] text-slate-600">{formatDate(log.timestamp)}</td>
                <td><span className="admin-table-primary">{log.userName}</span><span className="admin-table-secondary capitalize">{log.userRole}</span></td>
                <td><span className={`admin-badge ${getCategoryBadgeClass(log.category)}`}>{log.category.replaceAll('_', ' ')}</span></td>
                <td><span className="admin-badge admin-badge-navy admin-mono">{log.action}</span></td>
                <td className="admin-audit-detail">
                  {log.targetType && log.targetId && <div className="admin-audit-target admin-mono">Target: {log.targetType} ({log.targetId})</div>}
                  {log.details}
                </td>
              </tr>)}
              {filteredLogs.length === 0 && <tr><td colSpan={5} className="admin-empty-state"><ShieldCheck /><strong>No matching audit records</strong><span>Change the search or category filter to view recorded activity.</span></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
