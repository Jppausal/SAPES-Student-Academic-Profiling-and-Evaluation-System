import React, { useEffect, useMemo, useState } from 'react';
import { AcademicSubject, StudentIdentity, StudentReport } from '../../lib/api';

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
  if (['regular', 'eligible', 'passed'].includes(value)) return 'passed';
  if (['probationary', 'probation', 'on probation', 'under probation', 'fda', 'failure due to absences', 'not eligible', 'failed', 'at-risk', 'at risk'].includes(value)) return 'risk';
  if (['pending', 'incomplete', 'inc', 'for review', 'not evaluated'].includes(value)) return 'pending';
  return 'neutral';
};

const RecordedStatus: React.FC<{ value?: string }> = ({ value }) => (
  <span className={`student-status student-status-${statusTone(value)}`}>{statusLabel(value)}</span>
);

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
  const gwa = selectedRecord?.majorSubjectGwa;
  const evaluation = report.facultyEvaluation;
  const evaluationDate = evaluation?.evaluatedAt ? new Date(evaluation.evaluatedAt) : null;
  const reasons = Array.isArray(evaluation?.reasons) ? evaluation.reasons.filter((reason) => typeof reason === 'string' && reason.trim()) : [];

  return (
    <div className="student-record-workspace">
      <section className="student-transcript" aria-labelledby="student-record-heading">
        <div className="student-section-heading">
          <h2 id="student-record-heading">Academic records</h2>
          <p>Review your subjects and grades by academic period.</p>
        </div>
        {(invalidRecordCount > 0 || !Array.isArray(report.academicRecords)) && <p role="alert" className="student-notice">Some academic records could not be displayed because their period information is incomplete.</p>}
        {validRecords.length === 0 ? (
          <div className="student-empty"><h3>No academic records yet</h3><p>Your subjects and grades will appear here when they are recorded. Contact your department if you expect to see a record.</p></div>
        ) : (
          <>
            <div className="student-period-toolbar">
              <div><label htmlFor="student-academic-year">Academic year</label>
                <select id="student-academic-year" value={selectedAcademicYear} onChange={(event) => {
                  const nextYear = event.target.value;
                  setSelectedAcademicYear(nextYear);
                  setSelectedSemester(validRecords.find((record) => record.academicYear === nextYear)?.semester || '');
                }}>{academicYears.map((year) => <option key={year} value={year}>{year}</option>)}</select>
              </div>
              <div><label htmlFor="student-semester">Semester</label>
                <select id="student-semester" value={selectedSemester} onChange={(event) => setSelectedSemester(event.target.value)}>
                  {semesters.map((semester) => <option key={semester} value={semester}>{semester}</option>)}
                </select>
              </div>
            </div>
            {selectedRecord ? (
              <div aria-live="polite">
                <div className="student-period-summary">
                  <div><h3>{selectedRecord.academicYear}, {selectedRecord.semester}</h3><p>{selectedSubjects.length} {selectedSubjects.length === 1 ? 'subject' : 'subjects'} recorded</p></div>
                  <dl><div><dt>Major subject GWA</dt><dd>{typeof gwa === 'number' && Number.isFinite(gwa) ? gwa.toFixed(2) : 'Not recorded'}</dd></div></dl>
                </div>
                {invalidSubjectCount > 0 && <p role="alert" className="student-notice">{invalidSubjectCount} malformed subject {invalidSubjectCount === 1 ? 'entry was' : 'entries were'} omitted.</p>}
                {selectedSubjects.length === 0 ? (
                  <div className="student-empty"><h3>No subjects recorded</h3><p>No subjects are recorded for this period.</p></div>
                ) : (
                  <div className="student-table-scroll" tabIndex={0} role="region" aria-label="Semester grades, scroll horizontally to see all columns">
                    <table className="student-grade-table">
                      <caption className="sr-only">Grades for {selectedRecord.academicYear}, {selectedRecord.semester}</caption>
                      <thead><tr><th scope="col">Code</th><th scope="col">Subject</th><th scope="col" className="student-number">Units</th><th scope="col">Type</th><th scope="col" className="student-number">Grade</th><th scope="col">Status</th></tr></thead>
                      <tbody>{selectedSubjects.map((subject, index) => <tr key={`${subject.subjectCode}-${index}`}>
                        <th scope="row">{subject.subjectCode}</th><td>{subject.subjectName}</td><td className="student-number">{subject.units}</td><td className="student-course-type">{subject.isMajor ? 'Major' : 'Non-major'}</td><td className="student-number student-grade">{subject.grade.toFixed(2)}</td><td><RecordedStatus value={subject.status} /></td>
                      </tr>)}</tbody>
                    </table>
                  </div>
                )}
                <p className="student-record-note">Grades and GWA are shown as recorded for this period. Contact your department about corrections.</p>
              </div>
            ) : <div className="student-notice">No record exists for the selected academic period.</div>}
          </>
        )}
      </section>
      <aside className="student-standing" aria-label="Academic standing and evaluation">
        <section aria-labelledby="student-standing-heading">
          <h2 id="student-standing-heading">Academic standing</h2>
          <p className="student-muted">Current recorded status</p>
          <RecordedStatus value={identity.academicStatus?.currentStatus} />
          {identity.academicStatus?.statusRemarks && <p>{identity.academicStatus.statusRemarks}</p>}
          {identity.academicStatus?.isOnProbation && <div className="student-probation"><strong>At-risk: on probation</strong><p>{identity.academicStatus.probationReason || 'Contact your adviser to discuss your recorded probation status.'}</p></div>}
        </section>
        <section aria-labelledby="student-evaluation-heading">
          <h2 id="student-evaluation-heading">Faculty evaluation</h2>
          {evaluation ? <>
            <RecordedStatus value={evaluation.evaluationStatus} />
            {evaluationDate && !Number.isNaN(evaluationDate.getTime()) && <p className="student-muted">Evaluated {evaluationDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
            {reasons.length > 0 && <ul className="student-evaluation-reasons">{reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>}
            {typeof evaluation.remarks === 'string' && evaluation.remarks && <p>{evaluation.remarks}</p>}
          </> : <><span className="student-status student-status-pending">Pending evaluation</span><p>No faculty evaluation is available yet.</p></>}
          <p className="student-record-note">This is the available evaluation for your account and may cover a different period.</p>
        </section>
      </aside>
    </div>
  );
};
