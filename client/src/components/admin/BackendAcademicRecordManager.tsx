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

const emptySubject = (): AcademicSubject => ({
  subjectCode: '',
  subjectName: '',
  units: 3,
  grade: 0,
  isMajor: false,
  status: 'Ongoing',
});

const emptyRecord = (): AcademicTermRecord => ({
  academicYear: '',
  semester: '',
  subjects: [],
});

export const BackendAcademicRecordManager: React.FC = () => {
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
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const nextReport = await fetchStudentReport(studentId);
      setReport(nextReport);
      setInstitutionId(nextReport.student.institutionId);
      setRecord(nextReport.academicRecords[0]
        ? { ...nextReport.academicRecords[0], subjects: nextReport.academicRecords[0].subjects.map((subject) => ({ ...subject })) }
        : emptyRecord());
      setStatus(nextReport.student.academicStatus?.currentStatus || 'regular');
    } catch (requestError) {
      setReport(null);
      setRecord(emptyRecord());
      setError(requestError instanceof Error ? requestError.message : 'Unable to load student record.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadReport();
  };

  const selectRecord = (selected: AcademicTermRecord) => {
    setRecord({ ...selected, subjects: selected.subjects.map((subject) => ({ ...subject })) });
    setError('');
    setMessage('');
  };

  const updateSubject = <K extends keyof AcademicSubject>(
    index: number,
    field: K,
    value: AcademicSubject[K]
  ) => {
    setRecord((current) => ({
      ...current,
      subjects: current.subjects.map((subject, subjectIndex) =>
        subjectIndex === index ? { ...subject, [field]: value } : subject
      ),
    }));
  };

  const handleSaveRecord = async () => {
    if (!report) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveAcademicRecord(report.student.institutionId, record);
      await loadReport(report.student.institutionId);
      setMessage('Academic record saved to the shared student record.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save academic record.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!report || !status.trim()) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateStudentStatus(report.student.institutionId, {
        status: status.trim(),
        reason: statusReason.trim() || undefined,
      });
      await loadReport(report.student.institutionId);
      setMessage('Academic status saved with a history entry.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save academic status.');
    } finally {
      setSaving(false);
    }
  };

  const studentName = report
    ? [report.student.personalInformation?.firstName, report.student.personalInformation?.lastName]
      .filter(Boolean)
      .join(' ')
    : '';
  const selectedPeriodLabel = record.academicYear && record.semester
    ? `${record.academicYear} · ${record.semester}`
    : 'No saved period selected';
  const selectedPeriodGwas = resolvePeriodGwas(record);
  const historicalFallbackGwas = resolveAcademicGwas(report?.academicRecords || []);
  const historicalOverallGwa = report?.overallGwa ?? historicalFallbackGwas.overallGwa;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-lg font-extrabold text-slate-900">Shared Academic Record</h2>
        <p className="mt-1 text-xs text-slate-500">Search the authoritative MongoDB student record by institution ID.</p>
        <form onSubmit={handleSearch} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={institutionId}
            onChange={(event) => setInstitutionId(event.target.value)}
            placeholder="Institution ID"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900"
            required
          />
          <button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            <Search className="h-4 w-4" /> {loading ? 'Loading…' : 'Load Student'}
          </button>
        </form>
        {error && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        {message && <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      </section>

      {report && (
        <>
          <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-lg font-extrabold text-slate-900">{studentName || 'Student record'}</p>
              <p className="font-mono text-xs text-slate-500">{report.student.institutionId}</p>
              <p className="mt-2 text-sm text-slate-600">Current status: <strong>{report.student.academicStatus?.currentStatus || 'Not recorded'}</strong></p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-indigo-700 px-5 py-3 text-white">
                <p className="text-[10px] uppercase tracking-wider text-indigo-200">Selected-period GWA</p>
                <div className="mt-1 grid grid-cols-2 gap-4"><div><span className="text-[10px] text-indigo-200">Overall</span><p className="text-2xl font-black">{formatAcademicGwa(selectedPeriodGwas.overallGwa)}</p></div><div><span className="text-[10px] text-indigo-200">Major</span><p className="text-2xl font-black">{formatAcademicGwa(selectedPeriodGwas.majorSubjectGwa)}</p></div></div>
                <p className="mt-1 text-[10px] text-indigo-100">{selectedPeriodLabel}</p>
              </div>
              <div className="rounded-xl bg-slate-900 px-5 py-3 text-white">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Historical cumulative GWA</p>
                <div className="mt-1 grid grid-cols-2 gap-4"><div><span className="text-[10px] text-slate-400">Overall</span><p className="text-2xl font-black">{formatAcademicGwa(historicalOverallGwa)}</p></div><div><span className="text-[10px] text-slate-400">Major</span><p className="text-2xl font-black">{formatAcademicGwa(report.majorSubjectGwa)}</p></div></div>
                <p className="mt-1 text-[10px] text-slate-300">All recorded periods combined</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="font-bold text-slate-900">Academic status</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
              <input value={status} onChange={(event) => setStatus(event.target.value)} placeholder="e.g. regular, probation" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={statusReason} onChange={(event) => setStatusReason(event.target.value)} placeholder="Reason for this status update" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <button type="button" disabled={saving} onClick={handleSaveStatus} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">Save Status</button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-bold text-slate-900">Term records</h3>
                <p className="text-xs text-slate-500">Select an existing term or create another one.</p>
              </div>
              <button type="button" onClick={() => setRecord(emptyRecord())} className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 px-4 py-2 text-xs font-bold text-indigo-700">
                <Plus className="h-4 w-4" /> New Term
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {report.academicRecords.map((term) => (
                <button key={`${term.academicYear}-${term.semester}`} type="button" onClick={() => selectRecord(term)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-100 hover:text-indigo-800">
                  {term.academicYear} · {term.semester}
                </button>
              ))}
              {report.academicRecords.length === 0 && <span className="text-xs text-slate-500">No academic terms recorded.</span>}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">Academic year<input value={record.academicYear} onChange={(event) => setRecord((current) => ({ ...current, academicYear: event.target.value }))} placeholder="2026-2027" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="text-xs font-semibold text-slate-700">Semester<input value={record.semester} onChange={(event) => setRecord((current) => ({ ...current, semester: event.target.value }))} placeholder="1st Semester" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
            </div>

            <div className="mt-5 space-y-3">
              {record.subjects.map((subject, index) => (
                <div key={index} className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-[0.8fr_1.6fr_0.5fr_0.5fr_0.6fr_0.8fr_auto]">
                  <input value={subject.subjectCode} onChange={(event) => updateSubject(index, 'subjectCode', event.target.value)} placeholder="Code" className="rounded-lg border border-slate-200 px-2 py-2 text-xs" />
                  <input value={subject.subjectName} onChange={(event) => updateSubject(index, 'subjectName', event.target.value)} placeholder="Subject name" className="rounded-lg border border-slate-200 px-2 py-2 text-xs" />
                  <input type="number" min="0.5" max="30" step="0.5" value={subject.units} onChange={(event) => updateSubject(index, 'units', Number(event.target.value))} aria-label="Units" className="rounded-lg border border-slate-200 px-2 py-2 text-xs" />
                  <input type="number" min="0" max="5" step="0.01" value={subject.grade} onChange={(event) => updateSubject(index, 'grade', Number(event.target.value))} aria-label="Grade" className="rounded-lg border border-slate-200 px-2 py-2 text-xs" />
                  <label className="flex items-center gap-1 text-xs font-semibold"><input type="checkbox" checked={subject.isMajor} onChange={(event) => updateSubject(index, 'isMajor', event.target.checked)} /> Major</label>
                  <input value={subject.status} onChange={(event) => updateSubject(index, 'status', event.target.value)} placeholder="Status" className="rounded-lg border border-slate-200 px-2 py-2 text-xs" />
                  <button type="button" aria-label="Remove subject" onClick={() => setRecord((current) => ({ ...current, subjects: current.subjects.filter((_, subjectIndex) => subjectIndex !== index) }))} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row">
              <button type="button" onClick={() => setRecord((current) => ({ ...current, subjects: [...current.subjects, emptySubject()] }))} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700"><BookOpen className="h-4 w-4" /> Add Subject</button>
              <button type="button" disabled={saving || !record.academicYear.trim() || !record.semester.trim()} onClick={handleSaveRecord} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Shared Record'}</button>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
