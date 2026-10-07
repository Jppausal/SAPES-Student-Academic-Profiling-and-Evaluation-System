import React, { useState } from 'react';
import { BookOpen, Plus, Save, Search, Trash2 } from 'lucide-react';
import {
  AcademicSubject,
  AcademicTermRecord,
  fetchStudentReport,
  saveAcademicRecord,
  StudentReport,
  updateStudentStatus,
} from '../../lib/api';
import { formatAcademicGwa, resolveAcademicGwas, resolvePeriodGwas } from '../../utils/mongoAcademicGwa';
import { AdminStudentProfileSetup } from './AdminStudentProfileSetup';

const emptySubject = (): AcademicSubject => ({
  subjectCode: '', subjectName: '', units: 3, grade: 0, isMajor: false, status: 'Ongoing',
});

const emptyRecord = (): AcademicTermRecord => ({ academicYear: '', semester: '', subjects: [] });

export const BackendAcademicRecordManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'academic' | 'profile'>('academic');
  const [institutionId, setInstitutionId] = useState('');
  const [report, setReport] = useState<StudentReport | null>(null);
  const [record, setRecord] = useState<AcademicTermRecord>(emptyRecord);
  const [status, setStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadReport = async (studentId = institutionId.trim()) => {
    if (!studentId) return;
    setLoading(true); setError(''); setMessage('');
    try {
      const nextReport = await fetchStudentReport(studentId);
      setReport(nextReport);
      setInstitutionId(nextReport.student.institutionId);
      setRecord(nextReport.academicRecords[0]
        ? { ...nextReport.academicRecords[0], subjects: nextReport.academicRecords[0].subjects.map((subject) => ({ ...subject })) }
        : emptyRecord());
      setStatus(nextReport.student.academicStatus?.currentStatus || 'regular');
    } catch (requestError) {
      setReport(null); setRecord(emptyRecord());
      setError(requestError instanceof Error ? requestError.message : 'Unable to load student record.');
    } finally { setLoading(false); }
  };

  const selectRecord = (selected: AcademicTermRecord) => {
    setRecord({ ...selected, subjects: selected.subjects.map((subject) => ({ ...subject })) });
    setError(''); setMessage('');
  };

  const updateSubject = <K extends keyof AcademicSubject>(index: number, field: K, value: AcademicSubject[K]) => {
    setRecord((current) => ({
      ...current,
      subjects: current.subjects.map((subject, subjectIndex) => subjectIndex === index ? { ...subject, [field]: value } : subject),
    }));
  };

  const handleSaveRecord = async () => {
    if (!report) return;
    setSaving(true); setError(''); setMessage('');
    try {
      await saveAcademicRecord(report.student.institutionId, record);
      await loadReport(report.student.institutionId);
      setMessage('Academic record saved to the shared student record.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save academic record.');
    } finally { setSaving(false); }
  };

  const handleSaveStatus = async () => {
    if (!report || !status.trim()) return;
    setSaving(true); setError(''); setMessage('');
    try {
      await updateStudentStatus(report.student.institutionId, { status: status.trim(), reason: statusReason.trim() || undefined });
      await loadReport(report.student.institutionId);
      setMessage('Academic status saved with a history entry.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save academic status.');
    } finally { setSaving(false); }
  };

  const studentName = report
    ? [report.student.personalInformation?.firstName, report.student.personalInformation?.lastName].filter(Boolean).join(' ')
    : '';
  const selectedPeriodLabel = record.academicYear && record.semester
    ? `${record.academicYear} / ${record.semester}` : 'No saved period selected';
  const selectedPeriodGwas = resolvePeriodGwas(record);
  const historicalFallbackGwas = resolveAcademicGwas(report?.academicRecords || []);
  const historicalOverallGwa = report?.overallGwa ?? historicalFallbackGwas.overallGwa;

  return (
    <div className="admin-page-stack" role="tabpanel">
      <section className="admin-panel admin-panel-body">
        <div className="admin-section-heading">
          <div className="flex items-start gap-3">
            <span className="admin-heading-icon"><BookOpen className="h-4 w-4" /></span>
            <div><h2>Shared academic record</h2><p>Search the authoritative MongoDB student record by institution ID.</p></div>
          </div>
        </div>
        <form onSubmit={async (event) => { event.preventDefault(); await loadReport(); }} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="admin-student-id-search" className="sr-only">Student institution ID</label>
          <input id="admin-student-id-search" value={institutionId} onChange={(event) => setInstitutionId(event.target.value)} placeholder="Enter institution ID" className="min-w-0 flex-1 px-3 py-2.5 text-sm" required />
          <button disabled={loading} className="admin-primary-button"><Search className="h-4 w-4" /> {loading ? 'Loading...' : 'Load Student'}</button>
        </form>
        {error && <p role="alert" className="admin-alert admin-alert-error mt-3">{error}</p>}
        {message && <p role="status" className="admin-alert admin-alert-success mt-3">{message}</p>}
      </section>

      {!report && !loading && !error && (
        <section className="admin-panel admin-empty-state"><Search /><strong>Find a student record</strong><span>Enter an institution ID to manage academic records or the student profile.</span></section>
      )}

      {report && <>
        <section className="admin-panel admin-record-summary">
          <div>
            <p className="text-lg font-bold text-slate-950">{studentName || 'Student record'}</p>
            <p className="admin-mono mt-1 text-xs text-slate-500">{report.student.institutionId}</p>
            <p className="mt-3 text-sm text-slate-600">Current status:<span className="admin-badge admin-badge-navy ml-2">{report.student.academicStatus?.currentStatus || 'Not recorded'}</span></p>
          </div>
          <div className="admin-record-gwas">
            <div className="admin-gwa-block is-current">
              <p className="admin-gwa-title">Selected period GWA</p>
              <div className="admin-gwa-values"><div><span>Overall</span><strong>{formatAcademicGwa(selectedPeriodGwas.overallGwa)}</strong></div><div><span>Major</span><strong>{formatAcademicGwa(selectedPeriodGwas.majorSubjectGwa)}</strong></div></div>
              <p className="mt-2 text-[10px] font-semibold text-blue-700">{selectedPeriodLabel}</p>
            </div>
            <div className="admin-gwa-block">
              <p className="admin-gwa-title">Historical cumulative GWA</p>
              <div className="admin-gwa-values"><div><span>Overall</span><strong>{formatAcademicGwa(historicalOverallGwa)}</strong></div><div><span>Major</span><strong>{formatAcademicGwa(report.majorSubjectGwa)}</strong></div></div>
              <p className="mt-2 text-[10px] text-slate-500">All recorded periods combined</p>
            </div>
          </div>
        </section>

        <nav className="admin-subtabs" aria-label="Student management sections">
          <button type="button" aria-current={activeTab === 'academic' ? 'page' : undefined} onClick={() => setActiveTab('academic')} className={`admin-subtab ${activeTab === 'academic' ? 'is-active' : ''}`}>Academic Records</button>
          <button type="button" aria-current={activeTab === 'profile' ? 'page' : undefined} onClick={() => setActiveTab('profile')} className={`admin-subtab ${activeTab === 'profile' ? 'is-active' : ''}`}>Student Profile</button>
        </nav>

        {activeTab === 'academic' && <>
          <section className="admin-panel admin-panel-body">
            <div className="admin-section-heading"><div><h3>Academic status</h3><p>Save an authorized standing update with its reason.</p></div></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
              <input aria-label="Academic status" value={status} onChange={(event) => setStatus(event.target.value)} placeholder="e.g. regular, probation" className="px-3 py-2 text-sm" />
              <input aria-label="Reason for academic status" value={statusReason} onChange={(event) => setStatusReason(event.target.value)} placeholder="Reason for this status update" className="px-3 py-2 text-sm" />
              <button type="button" disabled={saving} onClick={handleSaveStatus} className="admin-primary-button">Save Status</button>
            </div>
          </section>

          <section className="admin-panel admin-panel-body">
            <div className="admin-section-heading">
              <div><h3>Term records</h3><p>Select an existing term or create another one.</p></div>
              <button type="button" onClick={() => setRecord(emptyRecord())} className="admin-secondary-button"><Plus className="h-4 w-4" /> New Term</button>
            </div>
            <div className="admin-period-list mt-4">
              {report.academicRecords.map((term) => {
                const selected = record.academicYear === term.academicYear && record.semester === term.semester;
                return <button key={`${term.academicYear}-${term.semester}`} type="button" onClick={() => selectRecord(term)} className={`admin-period-button ${selected ? 'is-selected' : ''}`} aria-pressed={selected}>{term.academicYear} / {term.semester}</button>;
              })}
              {report.academicRecords.length === 0 && <span className="text-xs text-slate-500">No academic terms recorded.</span>}
            </div>
          </section>

          <section className="admin-panel admin-panel-body">
            <div className="admin-section-heading mb-4"><div><h3>Selected academic period</h3><p>{selectedPeriodLabel}</p></div></div>
            <div className="admin-form-grid">
              <label className="admin-control-label">Academic year<input value={record.academicYear} onChange={(event) => setRecord((current) => ({ ...current, academicYear: event.target.value }))} placeholder="2026-2027" className="mt-1 w-full px-3 py-2 text-sm" /></label>
              <label className="admin-control-label">Semester<input value={record.semester} onChange={(event) => setRecord((current) => ({ ...current, semester: event.target.value }))} placeholder="1st Semester" className="mt-1 w-full px-3 py-2 text-sm" /></label>
            </div>
            <div className="mt-5 space-y-3">
              {record.subjects.map((subject, index) => <div key={index} className="admin-table-wrap"><div className="admin-subject-grid">
                <input aria-label={`Subject code ${index + 1}`} value={subject.subjectCode} onChange={(event) => updateSubject(index, 'subjectCode', event.target.value)} placeholder="Code" />
                <input aria-label={`Subject name ${index + 1}`} value={subject.subjectName} onChange={(event) => updateSubject(index, 'subjectName', event.target.value)} placeholder="Subject name" />
                <input type="number" min="0.5" max="30" step="0.5" value={subject.units} onChange={(event) => updateSubject(index, 'units', Number(event.target.value))} aria-label={`Units for subject ${index + 1}`} />
                <input type="number" min="0" max="5" step="0.01" value={subject.grade} onChange={(event) => updateSubject(index, 'grade', Number(event.target.value))} aria-label={`Grade for subject ${index + 1}`} />
                <label className="flex items-center gap-1 text-xs font-semibold"><input type="checkbox" checked={subject.isMajor} onChange={(event) => updateSubject(index, 'isMajor', event.target.checked)} /> Major</label>
                <input aria-label={`Status for subject ${index + 1}`} value={subject.status} onChange={(event) => updateSubject(index, 'status', event.target.value)} placeholder="Status" />
                <button type="button" aria-label={`Remove subject ${index + 1}`} onClick={() => setRecord((current) => ({ ...current, subjects: current.subjects.filter((_, subjectIndex) => subjectIndex !== index) }))} className="admin-icon-button border-rose-200 text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div></div>)}
              {record.subjects.length === 0 && <div className="admin-empty-state py-8"><BookOpen /><strong>No subjects in this period</strong><span>Add a subject to begin the record.</span></div>}
            </div>
            <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row">
              <button type="button" onClick={() => setRecord((current) => ({ ...current, subjects: [...current.subjects, emptySubject()] }))} className="admin-secondary-button"><BookOpen className="h-4 w-4" /> Add Subject</button>
              <button type="button" disabled={saving || !record.academicYear.trim() || !record.semester.trim()} onClick={handleSaveRecord} className="admin-primary-button"><Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Shared Record'}</button>
            </div>
          </section>
        </>}

        {activeTab === 'profile' && <div className="admin-profile-workspace mt-1"><AdminStudentProfileSetup identity={report.student} onSaved={async () => { await loadReport(); }} /></div>}
      </>}
    </div>
  );
};
