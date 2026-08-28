import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SystemAuditLog } from '../../types';
import { ShieldCheck, Search, Filter, Clock, User, Sparkles, RefreshCw } from 'lucide-react';
import { formatDate } from '../../utils/academicCalculators';

export const SystemAuditLogsView: React.FC = () => {
  const { auditLogs } = useApp();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filteredLogs = auditLogs.filter((log) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      log.action.toLowerCase().includes(q) ||
      log.userName.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q);

    const matchesCat = categoryFilter === 'ALL' || log.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const getCategoryBadgeClass = (cat: SystemAuditLog['category']) => {
    switch (cat) {
      case 'AUTH':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'PROFILE_UPDATE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'FACULTY_EVALUATION':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'ACADEMIC_RECORD':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'USER_MANAGEMENT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail by user, action, or details..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-400 font-bold uppercase text-[10px] shrink-0">
            Category:
          </span>
          {['ALL', 'AUTH', 'PROFILE_UPDATE', 'FACULTY_EVALUATION', 'ACADEMIC_RECORD', 'USER_MANAGEMENT'].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor / User</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Action Taken</th>
                <th className="py-3 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No audit records match the current filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{log.userName}</div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        {log.userRole}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${getCategoryBadgeClass(
                          log.category
                        )}`}
                      >
                        {log.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 text-[11px]">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-slate-600 leading-relaxed max-w-md">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
