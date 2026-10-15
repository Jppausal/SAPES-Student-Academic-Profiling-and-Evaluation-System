import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileCheck2, RefreshCw, Search, Users } from 'lucide-react';
import { fetchInstitutionalStudentSummary, InstitutionalStudentSummary } from '../../lib/api';
import { formatAcademicGwa } from '../../utils/mongoAcademicGwa';

export const AdminReportsView: React.FC = () => {
  const [students, setStudents] = useState<InstitutionalStudentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statistics, setStatistics] = useState({ ip: 0, pwd: 0, probation: 0, evaluated: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = async () => {
    setLoading(true); setError('');
    try {
      const result = await fetchInstitutionalStudentSummary(page);
      setStudents(result.students); setTotal(result.pagination.total);
      setTotalPages(Math.max(result.pagination.totalPages, 1)); setStatistics(result.statistics);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load institutional reports.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadReport(); }, [page]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) => [
      student.institutionId,
      student.personalInformation.firstName,
      student.personalInformation.middleName,
      student.personalInformation.lastName,
      student.academicStatus.currentStatus,
      student.facultyEvaluation?.evaluationStatus,
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [search, students]);

  if (loading && students.length === 0) {
    return <div className="admin-panel admin-loading-state" role="status"><FileCheck2 />Loading institutional reports...</div>;
  }

  const metrics = [
    ['Total students', total], ['IP students', statistics.ip], ['PWD students', statistics.pwd],
    ['On probation', statistics.probation], ['Evaluated', statistics.evaluated],
  ] as const;

  return (
    <div className="admin-page-stack" role="tabpanel">
      <section className="admin-panel admin-panel-body">
        <div className="admin-section-heading">
          <div className="flex items-start gap-3">
            <span className="admin-heading-icon"><FileCheck2 className="h-4 w-4" /></span>
            <div><h2>Institutional analytics</h2><p>Shared student-record summary from the protected administrator report API.</p></div>
          </div>
          <button type="button" onClick={() => void loadReport()} disabled={loading} className="admin-secondary-button"><RefreshCw className="h-4 w-4" /> {loading ? 'Refreshing...' : 'Refresh data'}</button>
        </div>
        {error && <p role="alert" className="admin-alert admin-alert-error mt-4">{error}</p>}
      </section>

      <section className="admin-metric-grid" aria-label="Institutional metrics">
        {metrics.map(([label, value]) => <div key={label} className="admin-metric"><p className="admin-metric-label">{label}</p><p className="admin-metric-value">{value}</p></div>)}
      </section>

      <section className="admin-panel overflow-hidden">
        <div className="admin-toolbar border-b border-slate-200">
          <div className="admin-search-control">
            <Search />
            <label htmlFor="admin-report-search" className="sr-only">Filter students on this page</label>
            <input id="admin-report-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter this page by ID, name, status, or evaluation" />
          </div>
          <span className="admin-count"><strong>{filteredStudents.length}</strong> records shown on this page</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table" aria-label="Institutional student analytics">
            <thead><tr><th>Student</th><th>Classification</th><th>Religion</th><th>Records</th><th>Latest period GWA</th><th>Academic status</th><th>Evaluation</th></tr></thead>
            <tbody>
              {filteredStudents.map((student) => {
                const name = [student.personalInformation.lastName, student.personalInformation.firstName, student.personalInformation.middleName].filter(Boolean).join(', ');
                const classifications = [
                  student.classification.studentType,
                  student.classification.isIP ? 'IP' : '',
                  student.classification.isPWD ? 'PWD' : '',
                  student.classification.isShifter ? 'Shifter' : '',
                  student.classification.isTransferee ? 'Transferee' : '',
                ].filter(Boolean) as string[];
                const academicStatus = student.academicStatus.currentStatus || 'Not recorded';
                const evaluationStatus = student.facultyEvaluation?.evaluationStatus || 'Pending';
                return <tr key={student.institutionId}>
                  <td><span className="admin-table-primary">{name || 'Name not recorded'}</span><span className="admin-table-secondary admin-mono">{student.institutionId}</span></td>
                  <td><div className="flex max-w-52 flex-wrap gap-1">{classifications.length ? classifications.map((item) => <span key={item} className="admin-badge admin-badge-navy">{item}</span>) : <span className="text-slate-500">Not recorded</span>}</div></td>
                  <td>{student.religiousInformation.religion || 'Not recorded'}</td>
                  <td><span className="admin-number font-semibold text-slate-800">{student.academicRecordCount}</span> terms<br /><span className="text-[11px] text-slate-500">{student.subjectCount} subjects</span></td>
                  <td>{student.latestAcademicPeriod ? <>
                    <span className="admin-table-primary admin-number">Overall {formatAcademicGwa(student.latestAcademicPeriod.overallGwa)} / Major {formatAcademicGwa(student.latestAcademicPeriod.majorSubjectGwa)}</span>
                    <span className="admin-table-secondary">{student.latestAcademicPeriod.academicYear} / {student.latestAcademicPeriod.semester}</span>
                    <span className="block mt-1 text-[10px] text-slate-500">Cumulative: Overall {formatAcademicGwa(student.overallGwa)} / Major {formatAcademicGwa(student.majorSubjectGwa)}</span>
                  </> : <span className="text-slate-500">Not recorded</span>}</td>
                  <td><span className={`admin-badge ${student.academicStatus.isOnProbation ? 'admin-badge-red' : 'admin-badge-navy'}`}>{academicStatus}</span></td>
                  <td><span className={`admin-badge ${evaluationStatus.toLowerCase() === 'pending' ? 'admin-badge-amber' : 'admin-badge-green'}`}>{evaluationStatus}</span></td>
                </tr>;
              })}
              {filteredStudents.length === 0 && <tr><td colSpan={7} className="admin-empty-state"><Users /><strong>No matching students</strong><span>Clear or change the page filter to view records.</span></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="admin-pagination">
          <span>Page {page} of {totalPages} / {total} students total</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setSearch(''); setPage((current) => Math.max(1, current - 1)); }} disabled={loading || page <= 1} className="admin-secondary-button min-h-0 px-3 py-2"><ChevronLeft className="h-4 w-4" /> Previous</button>
            <button type="button" onClick={() => { setSearch(''); setPage((current) => Math.min(totalPages, current + 1)); }} disabled={loading || page >= totalPages} className="admin-secondary-button min-h-0 px-3 py-2">Next <ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>
    </div>
  );
};
