import type { StudentReport } from '../../lib/api';
import { formatAcademicGwa } from '../../utils/mongoAcademicGwa';
import { formatStatusLabel } from '../../utils/formatStatusLabel';

const dateLabel = (value?: string) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleDateString();
};

export function AdminStudentReport({ report }: { report: StudentReport }) {
  const { student, facultyEvaluation: evaluation } = report;
  const classification = student.classification;
  const classifications = [classification?.isShifter && 'Shifter', classification?.isTransferee && 'Transferee', classification?.isIP && 'IP', classification?.isPWD && 'PWD'].filter(Boolean);
  const facultyName = evaluation?.facultyId && typeof evaluation.facultyId === 'object'
    ? evaluation.facultyId.username
    : undefined;
  return <div className="admin-page-stack">
    <section className="admin-panel admin-panel-body">
      <div className="admin-section-heading"><h3>Student profile and standing</h3></div>
      <dl className="admin-form-grid mt-4">
        {Object.entries({
          'Institution ID': student.institutionId,
          Name: [student.personalInformation?.firstName, student.personalInformation?.lastName].filter(Boolean).join(' '),
          'Program / course': student.enrollmentInformation?.course || classification?.program,
          'Year level': student.enrollmentInformation?.yearLevel || student.enrollmentInformation?.level,
          Classifications: classifications.join(', ') || 'No classifications recorded',
          Religion: student.religiousInformation?.religion,
          'Current academic status': formatStatusLabel(student.academicStatus?.currentStatus),
          'Status remarks': student.academicStatus?.statusRemarks,
        }).map(([label, value]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="font-medium text-slate-950">{value || 'Not recorded'}</dd></div>)}
      </dl>
    </section>
    <section className="admin-panel admin-panel-body">
      <div className="admin-section-heading"><h3>Academic history</h3></div>
      <p className="my-3 text-sm">Historical cumulative GWA — Overall: {formatAcademicGwa(report.overallGwa)} · Major: {formatAcademicGwa(report.majorSubjectGwa)}</p>
      {report.academicRecords.length === 0 && <p>No academic records recorded.</p>}
      {report.academicRecords.map(term => <section key={`${term.academicYear}-${term.semester}`} className="mt-5">
        <h4 className="font-semibold">{term.academicYear} / {term.semester}</h4>
        <p className="my-2 text-sm">Period GWA — Overall: {formatAcademicGwa(term.overallGwa)} · Major: {formatAcademicGwa(term.majorSubjectGwa)}</p>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{['Code', 'Subject', 'Units', 'Grade', 'Type', 'Status'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{term.subjects.map(subject => <tr key={subject.subjectCode}><td>{subject.subjectCode}</td><td>{subject.subjectName}</td><td>{subject.units}</td><td>{subject.grade > 0 ? subject.grade.toFixed(2) : 'Ungraded'}</td><td>{subject.isMajor ? 'Major' : 'Non-major'}</td><td>{formatStatusLabel(subject.status)}</td></tr>)}</tbody>
        </table></div>
        {term.subjects.length === 0 && <p>No subjects recorded in this period.</p>}
      </section>)}
    </section>
    <section className="admin-panel admin-panel-body">
      <div className="admin-section-heading"><h3>Status history</h3></div>
      {report.statusHistory.length === 0 ? <p className="mt-3">No status history recorded.</p> : <div className="admin-table-wrap mt-3"><table className="admin-table"><thead><tr><th scope="col">Effective date</th><th scope="col">Status</th><th scope="col">Reason</th><th scope="col">Remarks</th></tr></thead><tbody>{report.statusHistory.map((entry, index) => <tr key={`${entry.effectiveDate}-${index}`}><td>{dateLabel(entry.effectiveDate)}</td><td>{formatStatusLabel(entry.status)}</td><td>{entry.reason || 'Not recorded'}</td><td>{entry.remarks || 'Not recorded'}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="admin-panel admin-panel-body">
      <div className="admin-section-heading"><h3>Faculty evaluation</h3></div>
      {!evaluation ? <p className="mt-3">No faculty evaluation recorded.</p> : <div className="mt-3 space-y-2 text-sm">
        <p>Status: <strong>{formatStatusLabel(evaluation.evaluationStatus)}</strong></p>
        <p>Remarks: {evaluation.remarks || 'Not recorded'}</p>
        <p>Reasons: {evaluation.reasons.length ? evaluation.reasons.join('; ') : 'Not recorded'}</p>
        <p>Faculty: {facultyName || 'Not recorded'}</p>
        <p>Evaluated: {dateLabel(evaluation.evaluatedAt)}</p>
        <p className="text-slate-500">Student-level evaluation; no academic period is assigned.</p>
      </div>}
    </section>
  </div>;
}
