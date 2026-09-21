import React, { useState } from 'react';
import { BookOpen, CheckCircle2, Search, ShieldAlert } from 'lucide-react';
import {
  fetchStudentReport,
  saveStudentEvaluation,
  StudentReport,
  updateStudentStatus,
} from '../../lib/api';

export const BackendStudentSearch: React.FC = () => {
  const [institutionId, setInstitutionId] = useState('');
  const [report, setReport] = useState<StudentReport | null>(null);
  const [evaluationStatus, setEvaluationStatus] = useState('for_review');
  const [remarks, setRemarks] = useState('');
  const [studentStatus, setStudentStatus] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const searchStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await fetchStudentReport(institutionId.trim());
      setReport(result);
      setEvaluationStatus(result.facultyEvaluation?.evaluationStatus || 'for_review');
      setRemarks(result.facultyEvaluation?.remarks || '');
    } catch (requestError) {
      setReport(null);
      setError(requestError instanceof Error ? requestError.message : 'Unable to find student.');
    } finally {
      setLoading(false);
    }
  };

  const saveEvaluation = async () => {
    if (!report) return;
    setLoading(true);
    setError('');
    try {
      await saveStudentEvaluation(report.student.institutionId, {
        evaluationStatus,
        reasons: [],
        remarks,
      });
      setMessage('Faculty evaluation saved.');
      setReport(await fetchStudentReport(report.student.institutionId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save evaluation.');
    } finally {
      setLoading(false);
    }
  };

  const saveStatus = async () => {
    if (!report || !studentStatus.trim()) return;
    setLoading(true);
    setError('');
    try {
      await updateStudentStatus(report.student.institutionId, {
        status: studentStatus.trim(),
        remarks: 'Updated from faculty dashboard.',
      });
      setMessage('Student status updated.');
      setReport(await fetchStudentReport(report.student.institutionId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update status.');
    } finally {
      setLoading(false);
    }
  };

  const studentName = report?.student.personalInformation
    ? `${report.student.personalInformation.firstName || ''} ${report.student.personalInformation.lastName || ''}`.trim()
    : report?.student.institutionId;

  return (
    <section className="rounded-3xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Primary workflow</p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">Search student by institution ID</h2>
          <p className="mt-1 text-xs text-slate-600">Uses the protected backend report, evaluation, and status APIs.</p>
        </div>
        <Search className="hidden h-8 w-8 text-indigo-500 sm:block" />
      </div>

      <form onSubmit={searchStudent} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={institutionId}
          onChange={(event) => setInstitutionId(event.target.value)}
          placeholder="e.g. TEST-0001"
          className="min-w-0 flex-1 rounded-xl border border-indigo-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          required
        />
        <button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
          <Search className="h-4 w-4" /> {loading ? 'Loading…' : 'Search Student'}
        </button>
      </form>

      {error && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {message && <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      {report && (
        <div className="mt-5 space-y-4 rounded-2xl border border-white bg-white p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-lg font-extrabold text-slate-900">{studentName || 'Student record'}</p>
              <p className="font-mono text-xs text-slate-500">{report.student.institutionId}</p>
            </div>
            <div className="rounded-xl bg-slate-900 px-4 py-3 text-white">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Major-subject GWA</p>
              <p className="text-2xl font-black">{report.majorSubjectGwa.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">Current status</span><strong className="mt-1 block text-slate-900">{report.student.academicStatus?.currentStatus || 'Not recorded'}</strong></div>
            <div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">Academic records</span><strong className="mt-1 block text-slate-900">{report.academicRecords.length}</strong></div>
            <div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">Latest evaluation</span><strong className="mt-1 block text-slate-900">{report.facultyEvaluation?.evaluationStatus || 'For review'}</strong></div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><BookOpen className="h-4 w-4 text-indigo-600" /> Faculty evaluation</h3>
              <select value={evaluationStatus} onChange={(event) => setEvaluationStatus(event.target.value)} className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="eligible">Eligible</option>
                <option value="not_eligible">Not eligible</option>
                <option value="for_review">For review</option>
              </select>
              <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Evaluation remarks" className="mt-2 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <button onClick={saveEvaluation} disabled={loading} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"><CheckCircle2 className="h-4 w-4" /> Save evaluation</button>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><ShieldAlert className="h-4 w-4 text-amber-600" /> Current status</h3>
              <input value={studentStatus} onChange={(event) => setStudentStatus(event.target.value)} placeholder="e.g. Regular, On probation" className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <button onClick={saveStatus} disabled={loading || !studentStatus.trim()} className="mt-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">Update student status</button>
              <p className="mt-3 text-xs text-slate-500">Status history entries are refreshed after a successful update.</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
