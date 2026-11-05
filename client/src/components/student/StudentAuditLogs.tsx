import React, { useEffect, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight, Clock3, RefreshCw, ShieldCheck } from 'lucide-react';
import { ApiAuditLog, fetchMyAuditLogs } from '../../lib/api';

const actionLabel = (action: string) => action
  .toLowerCase()
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const targetLabel = (targetType: string) => targetType
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (timestamp: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(timestamp));

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

const getAuditTitle = (log: ApiAuditLog) => {
  const updatedSections = getUpdatedSections(log.details);
  if (updatedSections.length > 0) {
    return `Updated ${updatedSections.join(', ')}`;
  }
  return actionLabel(log.action);
};

const getAuditDescription = (log: ApiAuditLog) => {
  const updatedSections = getUpdatedSections(log.details);
  if (updatedSections.length > 0) {
    return 'Student profile information';
  }
  return `${targetLabel(log.targetType)} activity`;
};

export const StudentAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = async (requestedPage = page) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchMyAuditLogs(requestedPage);
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
    void loadLogs(1);
  }, []);

  return (
    <section className="student-audit-page" aria-labelledby="student-audit-heading">
      <div className="student-audit-heading">
        <div>
          <div className="student-audit-title-row">
            <div className="student-heading-icon-tile"><Activity className="student-tile-icon" /></div>
            <div>
              <h2 id="student-audit-heading">Audit logs</h2>
              <p>A clear history of activity related to your account.</p>
            </div>
          </div>
        </div>
        <button type="button" className="student-audit-refresh" onClick={() => void loadLogs(page)} disabled={loading}>
          <RefreshCw className={loading ? 'student-audit-spin' : ''} size={16} />
          Refresh
        </button>
      </div>

      {loading && <div role="status" className="student-audit-empty">Loading your activity...</div>}
      {!loading && error && <div role="alert" className="student-notice student-notice-error">{error}</div>}
      {!loading && !error && logs.length === 0 && (
        <div className="student-audit-empty">
          <ShieldCheck size={24} />
          <strong>No activity recorded yet</strong>
          <span>Actions related to your account will appear here.</span>
        </div>
      )}
      {!loading && !error && logs.length > 0 && (
        <>
          <div className="student-audit-list">
            {logs.map((log) => (
              <article className="student-audit-item" key={log._id || `${log.action}-${log.timestamp}`}>
                <div className="student-audit-marker"><Clock3 size={16} /></div>
                <div className="student-audit-content">
                  <div className="student-audit-item-header">
                    <h3>{getAuditTitle(log)}</h3>
                    <time dateTime={log.timestamp}>{formatDate(log.timestamp)}</time>
                  </div>
                  <p>{getAuditDescription(log)}</p>
                </div>
              </article>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="student-audit-pagination">
              <button type="button" onClick={() => void loadLogs(page - 1)} disabled={page <= 1 || loading} aria-label="Previous page">
                <ChevronLeft size={17} /> Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button type="button" onClick={() => void loadLogs(page + 1)} disabled={page >= totalPages || loading} aria-label="Next page">
                Next <ChevronRight size={17} />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};
