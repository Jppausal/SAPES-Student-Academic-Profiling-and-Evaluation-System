import React, { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Search, ShieldAlert } from 'lucide-react';
import {
  fetchStudentReport,
  fetchStudentSuggestions,
  saveStudentEvaluation,
  StudentReport,
  StudentSuggestion,
  updateStudentStatus,
} from '../../lib/api';

interface BackendStudentSearchProps {
  displayMode?: 'consolidated' | 'records';
}

export const BackendStudentSearch: React.FC<BackendStudentSearchProps> = ({ displayMode = 'consolidated' }) => {
  const [institutionId, setInstitutionId] = useState('');
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [evaluationStatus, setEvaluationStatus] = useState('for_review');
  const [reasons, setReasons] = useState('');
  const [remarks, setRemarks] = useState('');
  const [studentStatus, setStudentStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = institutionId.trim();
    if (!query || report) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setSuggestionsLoading(false);
      setSuggestionsError('');
      return;
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      setSuggestionsError('');
      try {
        const matches = await fetchStudentSuggestions(query);
        if (!active) return;
        setSuggestions(matches);
        setSuggestionsOpen(true);
        setActiveSuggestionIndex(-1);
      } catch (requestError) {
        if (!active) return;
        setSuggestions([]);
        setSuggestionsError(requestError instanceof Error ? requestError.message : 'Unable to load suggestions.');
      } finally {
        if (active) setSuggestionsLoading(false);
      }
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [institutionId, report]);

  const findStudent = async (query: string, selectedSuggestion?: StudentSuggestion) => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      let match = selectedSuggestion;
      if (!match) {
        const matches = await fetchStudentSuggestions(query.trim());
        const normalizedQuery = query.trim().toLowerCase();
        const idMatch = matches.find((student) => student.institutionId.toLowerCase() === normalizedQuery);
        const usernameMatch = matches.find((student) => student.username.toLowerCase() === normalizedQuery);
        const fullNameMatches = matches.filter((student) => `${student.firstName} ${student.lastName}`.trim().toLowerCase() === normalizedQuery);
        match = idMatch || usernameMatch || (fullNameMatches.length === 1 ? fullNameMatches[0] : undefined);
        if (!match && matches.length === 1) match = matches[0];
        if (!match) {
          throw new Error(matches.length ? 'Choose a student from the suggestions.' : 'No matching student was found.');
        }
      }

      const result = await fetchStudentReport(match.institutionId);
      setInstitutionId(match.institutionId);
      setSuggestions([]);
      setSuggestionsOpen(false);
      setReport(result);
      setEvaluationStatus(result.facultyEvaluation?.evaluationStatus || 'for_review');
      setReasons(result.facultyEvaluation?.reasons?.join(', ') || '');
      setRemarks(result.facultyEvaluation?.remarks || '');
      setStudentStatus(result.student.academicStatus?.currentStatus || '');
    } catch (requestError) {
      setReport(null);
      setError(requestError instanceof Error ? requestError.message : 'Unable to find student.');
    } finally {
      setLoading(false);
    }
  };

  const searchStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    await findStudent(institutionId);
  };

  const saveEvaluation = async () => {
    if (!report) return;
    setLoading(true);
    setError('');
    try {
      await saveStudentEvaluation(report.student.institutionId, {
        evaluationStatus,
        reasons: reasons.split(',').map((reason) => reason.trim()).filter(Boolean),
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
        reason: statusReason.trim() || undefined,
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
      <div className="mb-4 grid gap-2 lg:grid-cols-[minmax(260px,0.8fr)_minmax(440px,1.2fr)] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Primary workflow</p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">{displayMode === 'records' ? 'Find student academic records' : 'Search students'}</h2>
          <p className="mt-1 text-xs text-slate-600">Search by student ID, first or last name, or username.</p>
        </div>
        <form onSubmit={searchStudent} className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <input
            value={institutionId}
            onChange={(event) => {
              setInstitutionId(event.target.value);
              setReport(null);
              setError('');
              setSuggestionsOpen(Boolean(event.target.value.trim()));
            }}
            onFocus={() => { if (institutionId.trim()) setSuggestionsOpen(true); }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setSuggestionsOpen(false);
              if (event.key === 'ArrowDown' && suggestions.length) {
                event.preventDefault();
                setSuggestionsOpen(true);
                setActiveSuggestionIndex((index) => Math.min(index + 1, suggestions.length - 1));
              }
              if (event.key === 'ArrowUp' && suggestions.length) {
                event.preventDefault();
                setActiveSuggestionIndex((index) => Math.max(index - 1, 0));
              }
              if (event.key === 'Enter' && suggestionsOpen && activeSuggestionIndex >= 0) {
                event.preventDefault();
                void findStudent(institutionId, suggestions[activeSuggestionIndex]);
              }
            }}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen}
            aria-controls="student-search-suggestions"
            aria-activedescendant={activeSuggestionIndex >= 0 ? `student-suggestion-${activeSuggestionIndex}` : undefined}
            placeholder="Enter a 10-digit student ID number or student's name"
            className="w-full min-w-0 rounded-xl border border-indigo-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            required
          />
          {suggestionsOpen && (
            <ul id="student-search-suggestions" role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
              {suggestionsLoading && <li className="px-3 py-2 text-xs text-slate-500">Searching students…</li>}
              {!suggestionsLoading && suggestionsError && <li role="alert" className="px-3 py-2 text-xs text-rose-600">{suggestionsError}</li>}
              {!suggestionsLoading && !suggestionsError && suggestions.length === 0 && <li className="px-3 py-2 text-xs text-slate-500">No matching students.</li>}
              {suggestions.map((student, index) => (
                <li key={student.institutionId} id={`student-suggestion-${index}`} role="option" aria-selected={activeSuggestionIndex === index}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSuggestionIndex(index)}
                    onClick={() => void findStudent(institutionId, student)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left ${activeSuggestionIndex === index ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-slate-800">{student.firstName} {student.lastName}</span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-500">{student.institutionId}</span>
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-500">@{student.username}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button disabled={loading} className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
          <Search className="h-4 w-4" /> {loading ? 'Loading…' : 'Search Student'}
        </button>
      </form>
      </div>

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

          {displayMode === 'consolidated' && <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><BookOpen className="h-4 w-4 text-indigo-600" /> Faculty evaluation</h3>
              <select value={evaluationStatus} onChange={(event) => setEvaluationStatus(event.target.value)} className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="eligible">Eligible</option>
                <option value="not_eligible">Not eligible</option>
                <option value="for_review">For review</option>
              </select>
              <input value={reasons} onChange={(event) => setReasons(event.target.value)} placeholder="Reasons, separated by commas" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Evaluation remarks" className="mt-2 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <button onClick={saveEvaluation} disabled={loading} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"><CheckCircle2 className="h-4 w-4" /> Save evaluation</button>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><ShieldAlert className="h-4 w-4 text-amber-600" /> Current status</h3>
              <input value={studentStatus} onChange={(event) => setStudentStatus(event.target.value)} placeholder="e.g. Regular, On probation" className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={statusReason} onChange={(event) => setStatusReason(event.target.value)} placeholder="Reason for status update" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <button onClick={saveStatus} disabled={loading || !studentStatus.trim()} className="mt-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">Update student status</button>
              <p className="mt-3 text-xs text-slate-500">Status history entries are refreshed after a successful update.</p>
            </div>
          </div>}

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Academic records</h3>
            {report.academicRecords.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No academic records have been entered.</p>
            )}
            {report.academicRecords.map((term) => (
              <div key={`${term.academicYear}-${term.semester}`} className="overflow-hidden rounded-xl border border-slate-200">
                <div className="bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700">{term.academicYear} · {term.semester}</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-y border-slate-200 text-slate-500"><tr><th className="px-3 py-2">Code</th><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Units</th><th className="px-3 py-2">Grade</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {term.subjects.map((subject) => (
                        <tr key={subject.subjectCode}>
                          <td className="px-3 py-2 font-mono font-semibold">{subject.subjectCode}</td>
                          <td className="px-3 py-2">{subject.subjectName}</td>
                          <td className="px-3 py-2">{subject.units}</td>
                          <td className="px-3 py-2 font-semibold">{subject.grade || '—'}</td>
                          <td className="px-3 py-2">{subject.isMajor ? 'Major' : 'General'}</td>
                          <td className="px-3 py-2">{subject.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
