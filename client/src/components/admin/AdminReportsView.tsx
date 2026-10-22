import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, FileCheck2, RefreshCw, Search, Users } from 'lucide-react';
import { fetchInstitutionalStudentSummary, InstitutionalStudentSummary } from '../../lib/api';
import { formatAcademicGwa } from '../../utils/mongoAcademicGwa';
import { formatStatusLabel } from '../../utils/formatStatusLabel';
import { Modal } from '../common/Modal';

export const AdminReportsView: React.FC = () => {
  const [students, setStudents] = useState<InstitutionalStudentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statistics, setStatistics] = useState({ ip: 0, pwd: 0, probation: 0, evaluated: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvaluationStudent, setSelectedEvaluationStudent] = useState<InstitutionalStudentSummary | null>(null);

  const loadReport = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchInstitutionalStudentSummary(page);
      setStudents(result.students);
      setTotal(result.pagination.total);
      setTotalPages(Math.max(result.pagination.totalPages, 1));
      setStatistics(result.statistics);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load institutional reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, [page]);

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
      student.facultyEvaluation?.remarks,
      ...(student.facultyEvaluation?.reasons || []),
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [search, students]);

  if (loading && students.length === 0) {
    return (
      <div className="admin-panel admin-loading-state" role="status">
        <FileCheck2 />
        Loading institutional reports...
      </div>
    );
  }

  const metrics = [
    ['Total students', total],
    ['IP students', statistics.ip],
    ['PWD students', statistics.pwd],
    ['On probation', statistics.probation],
    ['Evaluated', statistics.evaluated],
  ] as const;

  return (
    <div className="admin-page-stack" role="tabpanel">
      <section className="admin-panel admin-panel-body">
        <div className="admin-section-heading">
          <div className="flex items-start gap-3">
            <span className="admin-heading-icon"><FileCheck2 className="h-4 w-4" /></span>
            <div>
              <h2>Institutional analytics &amp; Faculty evaluations</h2>
              <p>Shared student-record summary and recorded faculty evaluation statuses and remarks.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadReport()}
            disabled={loading}
            className="admin-secondary-button"
          >
            <RefreshCw className="h-4 w-4" />
            {loading ? 'Refreshing...' : 'Refresh data'}
          </button>
        </div>
        {error && <p role="alert" className="admin-alert admin-alert-error mt-4">{error}</p>}
      </section>

      <section className="admin-metric-grid" aria-label="Institutional metrics">
        {metrics.map(([label, value]) => (
          <div key={label} className="admin-metric">
            <p className="admin-metric-label">{label}</p>
            <p className="admin-metric-value">{value}</p>
          </div>
        ))}
      </section>

      <section className="admin-panel overflow-hidden">
        <div className="admin-toolbar border-b border-slate-200">
          <div className="admin-search-control">
            <Search />
            <label htmlFor="admin-report-search" className="sr-only">Filter students on this page</label>
            <input
              id="admin-report-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter this page by ID, name, status, remarks, or evaluation..."
            />
          </div>
          <span className="admin-count">
            <strong>{filteredStudents.length}</strong> records shown on this page
          </span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table" aria-label="Institutional student analytics">
            <thead>
              <tr>
                <th>Student</th>
                <th>Classification</th>
                <th>Religion</th>
                <th>Records</th>
                <th>Latest period GWA</th>
                <th>Academic status</th>
                <th>Faculty Evaluation &amp; Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const name = [
                  student.personalInformation.lastName,
                  student.personalInformation.firstName,
                  student.personalInformation.middleName,
                ].filter(Boolean).join(', ');

                const classifications = [
                  student.classification.studentType,
                  student.classification.isIP ? 'IP' : '',
                  student.classification.isPWD ? 'PWD' : '',
                  student.classification.isShifter ? 'Shifter' : '',
                  student.classification.isTransferee ? 'Transferee' : '',
                ].filter(Boolean) as string[];

                const academicStatus = formatStatusLabel(student.academicStatus.currentStatus);
                const rawEvaluationStatus = student.facultyEvaluation?.evaluationStatus;
                const evaluationStatus = formatStatusLabel(rawEvaluationStatus || 'Pending');

                return (
                  <tr key={student.institutionId}>
                    <td>
                      <span className="admin-table-primary">{name || 'Name not recorded'}</span>
                      <span className="admin-table-secondary admin-mono">{student.institutionId}</span>
                    </td>
                    <td>
                      <div className="flex max-w-52 flex-wrap gap-1">
                        {classifications.length ? (
                          classifications.map((item) => (
                            <span key={item} className="admin-badge admin-badge-navy">
                              {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500">Not recorded</span>
                        )}
                      </div>
                    </td>
                    <td>{student.religiousInformation.religion || 'Not recorded'}</td>
                    <td>
                      <span className="admin-number font-semibold text-slate-800">
                        {student.academicRecordCount}
                      </span> terms
                      <br />
                      <span className="text-[11px] text-slate-500">
                        {student.subjectCount} subjects
                      </span>
                    </td>
                    <td>
                      {student.latestAcademicPeriod ? (
                        <>
                          <span className="admin-table-primary admin-number">
                            Overall {formatAcademicGwa(student.latestAcademicPeriod.overallGwa)} / Major {formatAcademicGwa(student.latestAcademicPeriod.majorSubjectGwa)}
                          </span>
                          <span className="admin-table-secondary">
                            {student.latestAcademicPeriod.academicYear} / {student.latestAcademicPeriod.semester}
                          </span>
                          <span className="block mt-1 text-[10px] text-slate-500">
                            Cumulative: Overall {formatAcademicGwa(student.overallGwa)} / Major {formatAcademicGwa(student.majorSubjectGwa)}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-500">Not recorded</span>
                      )}
                    </td>
                    <td>
                      <span className={`admin-badge ${student.academicStatus.isOnProbation ? 'admin-badge-red' : 'admin-badge-navy'}`}>
                        {academicStatus}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`admin-badge ${
                            !rawEvaluationStatus || rawEvaluationStatus.toLowerCase() === 'pending'
                              ? 'admin-badge-amber'
                              : rawEvaluationStatus.toLowerCase() === 'eligible'
                              ? 'admin-badge-green'
                              : 'admin-badge-red'
                          }`}
                        >
                          {evaluationStatus}
                        </span>

                        {student.facultyEvaluation ? (
                          <div className="flex flex-col items-start gap-0.5 mt-0.5">
                            <button
                              type="button"
                              onClick={() => setSelectedEvaluationStudent(student)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 hover:text-indigo-900 underline"
                              title="Click to view recorded remarks and details"
                            >
                              <Eye className="w-3 h-3" />
                              View remarks
                            </button>
                            {student.facultyEvaluation.remarks && (
                              <span className="text-[11px] text-slate-500 line-clamp-1 max-w-[200px]" title={student.facultyEvaluation.remarks}>
                                &ldquo;{student.facultyEvaluation.remarks}&rdquo;
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Awaiting evaluation</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={7} className="admin-empty-state">
                    <Users />
                    <strong>No matching students</strong>
                    <span>Clear or change the page filter to view records.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="admin-pagination">
          <span>Page {page} of {totalPages} / {total} students total</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage((current) => Math.max(1, current - 1));
              }}
              disabled={loading || page <= 1}
              className="admin-secondary-button min-h-0 px-3 py-2"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage((current) => Math.min(totalPages, current + 1));
              }}
              disabled={loading || page >= totalPages}
              className="admin-secondary-button min-h-0 px-3 py-2"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Modal for viewing recorded faculty evaluation statuses and remarks */}
      {selectedEvaluationStudent && (
        <Modal
          isOpen={Boolean(selectedEvaluationStudent)}
          onClose={() => setSelectedEvaluationStudent(null)}
          title="Faculty Evaluation Details & Remarks"
          subtitle={`Recorded evaluation for student ID: ${selectedEvaluationStudent.institutionId}`}
          maxWidth="lg"
          actions={
            <div className="flex w-full justify-end">
              <button
                type="button"
                onClick={() => setSelectedEvaluationStudent(null)}
                className="admin-secondary-button"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900 text-base">
                    {[
                      selectedEvaluationStudent.personalInformation.firstName,
                      selectedEvaluationStudent.personalInformation.lastName,
                    ].filter(Boolean).join(' ') || 'Student'}
                  </h4>
                  <p className="text-xs text-slate-500 admin-mono mt-0.5">
                    Institution ID: {selectedEvaluationStudent.institutionId}
                  </p>
                </div>
                <span
                  className={`admin-badge text-xs px-2.5 py-1 ${
                    (selectedEvaluationStudent.facultyEvaluation?.evaluationStatus || '').toLowerCase() === 'eligible'
                      ? 'admin-badge-green'
                      : (selectedEvaluationStudent.facultyEvaluation?.evaluationStatus || '').toLowerCase() === 'for_review'
                      ? 'admin-badge-amber'
                      : 'admin-badge-red'
                  }`}
                >
                  {formatStatusLabel(selectedEvaluationStudent.facultyEvaluation?.evaluationStatus || 'Pending')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-md border border-slate-200 p-2.5 bg-white">
                <span className="text-slate-500 block mb-0.5">Evaluated by</span>
                <span className="font-medium text-slate-800">
                  {selectedEvaluationStudent.facultyEvaluation?.faculty?.username
                    ? `Faculty: ${selectedEvaluationStudent.facultyEvaluation.faculty.username} (${selectedEvaluationStudent.facultyEvaluation.faculty.role || 'faculty'})`
                    : 'Faculty Evaluator'}
                </span>
              </div>
              <div className="rounded-md border border-slate-200 p-2.5 bg-white">
                <span className="text-slate-500 block mb-0.5">Evaluation Timestamp</span>
                <span className="font-medium text-slate-800">
                  {selectedEvaluationStudent.facultyEvaluation?.evaluatedAt
                    ? new Date(selectedEvaluationStudent.facultyEvaluation.evaluatedAt).toLocaleString()
                    : 'Not recorded'}
                </span>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Evaluation Reasons / Factors
              </h5>
              {selectedEvaluationStudent.facultyEvaluation?.reasons && selectedEvaluationStudent.facultyEvaluation.reasons.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedEvaluationStudent.facultyEvaluation.reasons.map((reason, idx) => (
                    <span key={idx} className="admin-badge admin-badge-navy text-xs">
                      {reason}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No specific reasons flagged.</p>
              )}
            </div>

            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Faculty Remarks &amp; Feedback Notes
              </h5>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-800 leading-relaxed min-h-[80px]">
                {selectedEvaluationStudent.facultyEvaluation?.remarks?.trim() ? (
                  <p className="whitespace-pre-wrap">{selectedEvaluationStudent.facultyEvaluation.remarks}</p>
                ) : (
                  <p className="text-slate-400 italic">No qualitative remarks entered by the evaluator.</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
