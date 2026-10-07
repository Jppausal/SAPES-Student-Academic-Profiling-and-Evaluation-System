import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
} from 'lucide-react';
import { AcademicSubject, StudentIdentity, StudentReport } from '../../lib/api';
import { formatAcademicGwa, resolvePeriodGwas } from '../../utils/mongoAcademicGwa';

interface BackendStudentWorkspaceProps {
  identity: StudentIdentity;
  report: StudentReport;
}

// Color follows recorded text only. Grades and GWA never determine status.
const statusLabel = (status?: string) => typeof status === 'string' && status.trim()
  ? status.trim().replace(/_/g, ' ')
  : 'Not recorded';

const statusTone = (status?: string) => {
  const value = statusLabel(status).toLowerCase();
  if (['regular', 'eligible', 'passed', 'completed'].includes(value)) return 'passed';
  if (['probationary', 'probation', 'on probation', 'under probation', 'fda', 'failure due to absences', 'not eligible', 'failed', 'at-risk', 'at risk'].includes(value)) return 'risk';
  if (['pending', 'incomplete', 'inc', 'for review', 'not evaluated', 'pending evaluation'].includes(value)) return 'pending';
  return 'neutral';
};

const RecordedStatus: React.FC<{ value?: string }> = ({ value }) => {
  const tone = statusTone(value);
  const label = statusLabel(value);
  return (
    <span className={`student-status student-status-${tone}`}>
      {tone === 'passed' && <CheckCircle2 className="student-status-icon" />}
      {tone === 'pending' && <Clock className="student-status-icon" />}
      {tone === 'risk' && <AlertCircle className="student-status-icon" />}
      {tone === 'neutral' && <span className="student-status-dot" />}
      <span>{label}</span>
    </span>
  );
};

const isValidAcademicSubject = (subject: unknown): subject is AcademicSubject => {
  if (!subject || typeof subject !== 'object') return false;
  const candidate = subject as Partial<AcademicSubject>;
  return typeof candidate.subjectCode === 'string' &&
    typeof candidate.subjectName === 'string' &&
    Number.isFinite(candidate.units) && Number.isFinite(candidate.grade) &&
    typeof candidate.isMajor === 'boolean' && typeof candidate.status === 'string';
};

export const BackendStudentWorkspace: React.FC<BackendStudentWorkspaceProps> = ({ identity, report }) => {
  const validRecords = useMemo(() => (Array.isArray(report.academicRecords) ? report.academicRecords : []).filter((record) =>
    record && typeof record.academicYear === 'string' && Boolean(record.academicYear.trim()) &&
    typeof record.semester === 'string' && Boolean(record.semester.trim()) && Array.isArray(record.subjects)
  ), [report.academicRecords]);
  const invalidRecordCount = Array.isArray(report.academicRecords) ? report.academicRecords.length - validRecords.length : 0;
  const academicYears = useMemo(() => [...new Set(validRecords.map((record) => record.academicYear))], [validRecords]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(academicYears[0] || '');
  const semesters = useMemo(() => [...new Set(validRecords.filter((record) => record.academicYear === selectedAcademicYear).map((record) => record.semester))], [selectedAcademicYear, validRecords]);
  const [selectedSemester, setSelectedSemester] = useState(semesters[0] || '');

  useEffect(() => {
    if (!academicYears.includes(selectedAcademicYear)) setSelectedAcademicYear(academicYears[0] || '');
  }, [academicYears, selectedAcademicYear]);
  useEffect(() => {
    if (!semesters.includes(selectedSemester)) setSelectedSemester(semesters[0] || '');
  }, [selectedSemester, semesters]);

  const selectedRecord = validRecords.find((record) => record.academicYear === selectedAcademicYear && record.semester === selectedSemester);
  const selectedSubjects = selectedRecord?.subjects.filter(isValidAcademicSubject) || [];
  const invalidSubjectCount = (selectedRecord?.subjects.length || 0) - selectedSubjects.length;
  const periodGwas = resolvePeriodGwas(selectedRecord);
  const evaluation = report.facultyEvaluation;
  const evaluationDate = evaluation?.evaluatedAt ? new Date(evaluation.evaluatedAt) : null;
  const reasons = Array.isArray(evaluation?.reasons) ? evaluation.reasons.filter((reason) => typeof reason === 'string' && reason.trim()) : [];

  return (
    <div className="student-record-workspace">
      <section className="student-transcript" aria-labelledby="student-record-heading">
        <div className="student-section-heading">
          <div className="student-heading-icon-tile">
            <BookOpen className="student-tile-icon" />
          </div>
          <div>
            <h2 id="student-record-heading">Academic records</h2>
            <p>Review your subjects and grades by academic period.</p>
          </div>
        </div>

        {(invalidRecordCount > 0 || !Array.isArray(report.academicRecords)) && (
          <p role="alert" className="student-notice">
            Some academic records could not be displayed because their period information is incomplete.
          </p>
        )}

        {validRecords.length === 0 ? (
          <div className="student-empty">
            <h3>No academic records yet</h3>
            <p>Your subjects and grades will appear here when they are recorded. Contact your department if you expect to see a record.</p>
          </div>
        ) : (
          <>
            <div className="student-period-toolbar">
              <div className="student-period-control">
                <label htmlFor="student-academic-year">
                  <Calendar className="student-input-icon" />
                  <span>Academic year</span>
                </label>
                <div className="student-select-wrapper">
                  <select
                    id="student-academic-year"
                    value={selectedAcademicYear}
                    onChange={(event) => {
                      const nextYear = event.target.value;
                      setSelectedAcademicYear(nextYear);
                      setSelectedSemester(validRecords.find((record) => record.academicYear === nextYear)?.semester || '');
                    }}
                  >
                    {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                  <ChevronDown className="student-select-chevron" />
                </div>
              </div>
              <div className="student-period-control">
                <label htmlFor="student-semester">
                  <Calendar className="student-input-icon" />
                  <span>Semester</span>
                </label>
                <div className="student-select-wrapper">
                  <select
                    id="student-semester"
                    value={selectedSemester}
                    onChange={(event) => setSelectedSemester(event.target.value)}
                  >
                    {semesters.map((semester) => <option key={semester} value={semester}>{semester}</option>)}
                  </select>
                  <ChevronDown className="student-select-chevron" />
                </div>
              </div>
            </div>

            {selectedRecord ? (
              <div aria-live="polite">
                <div className="student-period-summary">
                  <div className="student-summary-meta">
                    <h3>{selectedRecord.academicYear}, {selectedRecord.semester}</h3>
                    <p>{selectedSubjects.length} {selectedSubjects.length === 1 ? 'subject' : 'subjects'} recorded</p>
                  </div>
                  <div className="student-gwa-metrics">
                    <div className="student-gwa-panel">
                      <div className="student-gwa-label-group">
                        <BarChart3 className="student-gwa-icon" />
                        <span>Overall GWA</span>
                      </div>
                      <div className="student-gwa-value">{formatAcademicGwa(periodGwas.overallGwa)}</div>
                    </div>
                    <div className="student-gwa-panel">
                      <div className="student-gwa-label-group">
                        <BookOpen className="student-gwa-icon" />
                        <span>Major GWA</span>
                      </div>
                      <div className="student-gwa-value">{formatAcademicGwa(periodGwas.majorSubjectGwa)}</div>
                    </div>
                  </div>
                </div>

                {invalidSubjectCount > 0 && (
                  <p role="alert" className="student-notice">
                    {invalidSubjectCount} malformed subject {invalidSubjectCount === 1 ? 'entry was' : 'entries were'} omitted.
                  </p>
                )}

                {selectedSubjects.length === 0 ? (
                  <div className="student-empty">
                    <h3>No subjects recorded</h3>
                    <p>No subjects are recorded for this period.</p>
                  </div>
                ) : (
                  <div className="student-table-scroll" tabIndex={0} role="region" aria-label="Semester grades, scroll horizontally to see all columns">
                    <table className="student-grade-table">
                      <caption className="sr-only">Grades for {selectedRecord.academicYear}, {selectedRecord.semester}</caption>
                      <thead>
                        <tr>
                          <th scope="col">Code</th>
                          <th scope="col">Subject</th>
                          <th scope="col" className="student-col-center">Units</th>
                          <th scope="col">Type</th>
                          <th scope="col" className="student-col-center">Grade</th>
                          <th scope="col">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSubjects.map((subject, index) => {
                          const badgeClass = subject.isMajor
                            ? 'student-badge-major'
                            : 'student-badge-nonmajor';
                          const typeLabel = subject.isMajor ? 'Major' : 'Non-major';

                          return (
                            <tr key={`${subject.subjectCode}-${index}`}>
                              <th scope="row" className="student-code-cell">{subject.subjectCode}</th>
                              <td className="student-subject-cell">{subject.subjectName}</td>
                              <td className="student-col-center student-units-cell">{subject.units}</td>
                              <td>
                                <span className={`student-type-pill ${badgeClass}`}>{typeLabel}</span>
                              </td>
                              <td className="student-col-center">
                                <span className="student-grade-pill">{subject.grade.toFixed(2)}</span>
                              </td>
                              <td>
                                <RecordedStatus value={subject.status} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="student-record-note">
                  Grades and GWA are shown as recorded for this period. Contact your department about corrections.
                </p>
              </div>
            ) : (
              <div className="student-notice">No record exists for the selected academic period.</div>
            )}
          </>
        )}
      </section>

      <aside className="student-standing" aria-label="Academic standing and evaluation">
        {/* Academic Standing Card */}
        <section className="student-side-card student-standing-card" aria-labelledby="student-standing-heading">
          <div className="student-side-header">
            <div className="student-side-icon-tile student-tile-blue">
              <BarChart3 className="student-tile-icon" />
            </div>
            <div>
              <h2 id="student-standing-heading">Academic standing</h2>
              <p className="student-muted">Current recorded status</p>
            </div>
          </div>
          <div className="student-standing-body">
            <div className="student-standing-badge">
              <span className="student-standing-indicator" />
              <span>{statusLabel(identity.academicStatus?.currentStatus) || 'Regular'}</span>
            </div>
            {identity.academicStatus?.statusRemarks && (
              <p className="student-standing-remarks">{identity.academicStatus.statusRemarks}</p>
            )}
            {identity.academicStatus?.isOnProbation && (
              <div className="student-probation">
                <strong>At-risk: on probation</strong>
                <p>{identity.academicStatus.probationReason || 'Contact your adviser to discuss your recorded probation status.'}</p>
              </div>
            )}
          </div>
        </section>

        {/* Faculty Evaluation Card */}
        <section className="student-side-card student-evaluation-card" aria-labelledby="student-evaluation-heading">
          <div className="student-side-header">
            <div className="student-side-icon-tile student-tile-amber">
              <FileText className="student-tile-icon" />
            </div>
            <div>
              <h2 id="student-evaluation-heading">Faculty evaluation</h2>
            </div>
          </div>
          <div className="student-evaluation-body">
            {evaluation ? (
              <>
                <div className="student-eval-badge">
                  <Clock className="student-eval-icon" />
                  <span>{statusLabel(evaluation.evaluationStatus)}</span>
                </div>
                {evaluationDate && !Number.isNaN(evaluationDate.getTime()) && (
                  <p className="student-muted student-eval-date">
                    Evaluated {evaluationDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
                {reasons.length > 0 && (
                  <ul className="student-evaluation-reasons">
                    {reasons.map((reason, index) => <li key={index}>{reason}</li>)}
                  </ul>
                )}
                {typeof evaluation.remarks === 'string' && evaluation.remarks && (
                  <p className="student-eval-remarks">{evaluation.remarks}</p>
                )}
              </>
            ) : (
              <>
                <div className="student-eval-badge">
                  <Clock className="student-eval-icon" />
                  <span>Pending evaluation</span>
                </div>
                <p className="student-eval-empty">No faculty evaluation is available yet.</p>
              </>
            )}
            <p className="student-record-note student-eval-note">
              This is the available evaluation for your account and may cover a different period.
            </p>
          </div>
        </section>
      </aside>
    </div>
  );
};
