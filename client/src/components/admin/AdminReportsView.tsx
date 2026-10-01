import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileCheck2, RefreshCw, Search, Users } from 'lucide-react';
import {
  fetchInstitutionalStudentSummary,
  InstitutionalStudentSummary,
} from '../../lib/api';

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
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [search, students]);

  if (loading && students.length === 0) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading institutional reports…</div>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700"><FileCheck2 className="h-4 w-4" /> Institutional analytics</div>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">Shared student-record summary</h2>
            <p className="mt-1 text-xs text-slate-500">Data is loaded from MongoDB through the protected administrator report API.</p>
          </div>
          <button type="button" onClick={() => void loadReport()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>
        {error && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Total students', total],
          ['IP students', statistics.ip],
          ['PWD students', statistics.pwd],
          ['On probation', statistics.probation],
          ['Evaluated', statistics.evaluated],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 p-4">
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter this page by ID, name, status, or evaluation" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Classification</th><th className="px-4 py-3">Religion</th><th className="px-4 py-3">Records</th><th className="px-4 py-3">Major GWA</th><th className="px-4 py-3">Academic status</th><th className="px-4 py-3">Evaluation</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => {
                const name = [student.personalInformation.lastName, student.personalInformation.firstName, student.personalInformation.middleName].filter(Boolean).join(', ');
                const classifications = [
                  student.classification.studentType,
                  student.classification.isIP ? 'IP' : '',
                  student.classification.isPWD ? 'PWD' : '',
                  student.classification.isShifter ? 'Shifter' : '',
                  student.classification.isTransferee ? 'Transferee' : '',
                ].filter(Boolean).join(' · ');
                return (
                  <tr key={student.institutionId}>
                    <td className="px-4 py-3"><strong className="block text-slate-900">{name || 'Name not recorded'}</strong><span className="font-mono text-slate-500">{student.institutionId}</span></td>
                    <td className="px-4 py-3 text-slate-700">{classifications || 'Not recorded'}</td>
                    <td className="px-4 py-3 text-slate-700">{student.religiousInformation.religion || 'Not recorded'}</td>
                    <td className="px-4 py-3 text-slate-700">{student.academicRecordCount} terms · {student.subjectCount} subjects</td>
                    <td className="px-4 py-3 font-bold text-indigo-800">{student.majorSubjectGwa.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-700">{student.academicStatus.currentStatus || 'Not recorded'}</td>
                    <td className="px-4 py-3 text-slate-700">{student.facultyEvaluation?.evaluationStatus || 'Pending'}</td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500"><Users className="mx-auto mb-2 h-5 w-5" />No matching students.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>Page {page} of {totalPages} · {total} students total</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setSearch(''); setPage((current) => Math.max(1, current - 1)); }} disabled={loading || page <= 1} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"><ChevronLeft className="h-4 w-4" /> Previous</button>
            <button type="button" onClick={() => { setSearch(''); setPage((current) => Math.min(totalPages, current + 1)); }} disabled={loading || page >= totalPages} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">Next <ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>
    </div>
  );
};
