import React, { useEffect, useState } from 'react';
import {
  Activity,
  BookOpenCheck,
  CalendarCheck2,
  ClipboardList,
  FileClock,
  MessageSquareText,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import {
  CourseEvaluationProgress,
  FacultyRosterStudent,
  FacultyStudentWorkspace,
  fetchFacultyEvaluationRoster,
  fetchFacultyStudentWorkspace,
  saveFacultyCourseEvaluation,
} from '../../lib/api';
import { TECHNOLOGY_PROGRAMS } from '../../lib/academicPrograms';
import { formatAcademicGwa, resolveAcademicGwas, resolvePeriodGwas } from '../../utils/mongoAcademicGwa';

type EvaluationTab = 'gradebook' | 'attendance' | 'remarks' | 'history';

const tabItems: Array<{ id: EvaluationTab; label: string; icon: typeof Activity }> = [
  { id: 'gradebook', label: 'Gradebook & Assessment Breakdown', icon: ClipboardList },
  { id: 'attendance', label: 'Attendance & Participation Log', icon: CalendarCheck2 },
  { id: 'remarks', label: 'Faculty Remarks & Rubrics', icon: MessageSquareText },
  { id: 'history', label: 'Academic History', icon: FileClock },
];

const emptyProgress = (): CourseEvaluationProgress => ({
  academicYear: '2026-2027',
  semester: '1st Semester',
  assessments: [],
  attendanceLogs: [],
  rubricScores: [],
  facultyRemarks: [],
  internalNotes: '',
});

const formatPercent = (value: number | null) => value === null ? '—' : `${value}%`;

const statusLabel = (student: FacultyRosterStudent | FacultyStudentWorkspace['student']) => {
  const isOnProbation = 'isOnProbation' in student
    ? student.isOnProbation
    : student.academicStatus.isOnProbation;
  if (isOnProbation) return 'Probationary';
  const status = 'currentStatus' in student ? student.currentStatus : student.academicStatus.currentStatus;
  return status ? status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Not recorded';
};

export const FacultyEvaluationPage: React.FC = () => {
  const [program, setProgram] = useState<string>(TECHNOLOGY_PROGRAMS[0].value);
  const [yearFilter, setYearFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [roster, setRoster] = useState<FacultyRosterStudent[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [workspace, setWorkspace] = useState<FacultyStudentWorkspace | null>(null);
  const [draft, setDraft] = useState<CourseEvaluationProgress | null>(null);
  const [activeTab, setActiveTab] = useState<EvaluationTab>('gradebook');
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    setLoadingRoster(true);
    setError('');
    setSelectedId('');
    setWorkspace(null);
    setDraft(null);
    fetchFacultyEvaluationRoster(program)
      .then((students) => {
        if (!active) return;
        setRoster(students);
        setLoadingRoster(false);
      })
      .catch((requestError) => {
        if (!active) return;
        setRoster([]);
        setError(requestError instanceof Error ? requestError.message : 'Unable to load the course roster.');
        setLoadingRoster(false);
      });
    return () => { active = false; };
  }, [program]);

  const visibleRoster = roster.filter((student) => (
    (yearFilter === 'all' || String(student.yearLevel) === yearFilter) &&
    (sectionFilter === 'all' || student.section === sectionFilter)
  ));
  const selectedRosterStudent = visibleRoster.find((student) => student.institutionId === selectedId) || null;

  useEffect(() => {
    if (!visibleRoster.length) {
      if (selectedId) setSelectedId('');
      return;
    }
    if (!visibleRoster.some((student) => student.institutionId === selectedId)) {
      setSelectedId(visibleRoster[0].institutionId);
    }
  }, [program, yearFilter, sectionFilter, roster, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setWorkspace(null);
      setDraft(null);
      return;
    }
    let active = true;
    setLoadingWorkspace(true);
    setMessage('');
    fetchFacultyStudentWorkspace(selectedId)
      .then((result) => {
        if (!active) return;
        setWorkspace(result);
        setDraft(result.courseEvaluation || emptyProgress());
      })
      .catch((requestError) => {
        if (!active) return;
        setWorkspace(null);
        setDraft(null);
        setError(requestError instanceof Error ? requestError.message : 'Unable to load the student evaluation workspace.');
      })
      .finally(() => { if (active) setLoadingWorkspace(false); });
    return () => { active = false; };
  }, [selectedId]);

  const sections = [...new Set(roster.map((student) => student.section).filter((section) => section !== 'Unassigned'))].sort();
  const years = [...new Set(roster.map((student) => student.yearLevel).filter((year): year is number => year !== null))].sort();
  const latestRecord = workspace?.academicRecords[0];
  const latestFallbackGwas = resolvePeriodGwas(latestRecord);
  const reportedLatestPeriod = workspace?.latestAcademicPeriod;
  const latestAcademicPeriod = reportedLatestPeriod || latestRecord ? {
    academicYear: reportedLatestPeriod?.academicYear || latestRecord?.academicYear || '',
    semester: reportedLatestPeriod?.semester || latestRecord?.semester || '',
    overallGwa: reportedLatestPeriod?.overallGwa ?? latestFallbackGwas.overallGwa ?? undefined,
    majorSubjectGwa: reportedLatestPeriod?.majorSubjectGwa ?? latestFallbackGwas.majorSubjectGwa ?? 0,
  } : null;
  const historicalFallbackGwas = resolveAcademicGwas(workspace?.academicRecords || []);
  const historicalOverallGwa = workspace?.overallGwa ?? historicalFallbackGwas.overallGwa;

  const updateAssessment = (index: number, field: string, value: string | number | boolean) => {
    setDraft((current) => current ? {
      ...current,
      assessments: current.assessments.map((assessment, itemIndex) => (
        itemIndex === index ? { ...assessment, [field]: value } : assessment
      )),
    } : current);
  };

  const saveProgress = async () => {
    if (!draft || !selectedId) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveFacultyCourseEvaluation(selectedId, draft);
      const [updatedWorkspace, updatedRoster] = await Promise.all([
        fetchFacultyStudentWorkspace(selectedId),
        fetchFacultyEvaluationRoster(program),
      ]);
      setWorkspace(updatedWorkspace);
      setDraft(updatedWorkspace.courseEvaluation);
      setRoster(updatedRoster);
      setMessage('Evaluation workspace saved.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save evaluation data.');
    } finally {
      setSaving(false);
    }
  };

  const addAssessment = () => setDraft((current) => current ? {
    ...current,
    assessments: [...current.assessments, { title: '', category: 'quiz', score: 0, possiblePoints: 10, submitted: false }],
  } : current);

  const addAttendance = () => setDraft((current) => current ? {
    ...current,
    attendanceLogs: [...current.attendanceLogs, { date: new Date().toISOString().slice(0, 10), status: 'present', notes: '', excuseLetter: '' }],
  } : current);

  const addRubric = () => setDraft((current) => current ? {
    ...current,
    rubricScores: [...current.rubricScores, { competency: '', rating: 0, maxRating: 5, notes: '' }],
  } : current);

  const addRemark = () => setDraft((current) => current ? {
    ...current,
    facultyRemarks: [...current.facultyRemarks, { text: '', createdAt: new Date().toISOString() }],
  } : current);

  const workspaceStudent = workspace?.student;
  const studentName = workspaceStudent
    ? `${workspaceStudent.personalInformation.firstName || ''} ${workspaceStudent.personalInformation.lastName || ''}`.trim()
    : '';

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Faculty workspace</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Evaluations</h1>
          <p className="mt-1 text-sm text-slate-600">Review student standing, gradebook, attendance, and academic history.</p>
        </div>
        <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900">Development sample records</span>
      </header>

      <section aria-label="Select course" className="flex gap-2 overflow-x-auto pb-1">
        {TECHNOLOGY_PROGRAMS.map((item) => (
          <button key={item.value} type="button" onClick={() => setProgram(item.value)} aria-pressed={program === item.value} className={`shrink-0 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition ${program === item.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
            {item.label}
          </button>
        ))}
      </section>

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Course roster</h2>
              <span className="text-xs font-semibold text-slate-500">{visibleRoster.length}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-[10px] font-semibold uppercase text-slate-500">Year
                <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-medium normal-case text-slate-700">
                  <option value="all">All years</option>
                  {years.map((year) => <option key={year} value={year}>{year} year</option>)}
                </select>
              </label>
              <label className="text-[10px] font-semibold uppercase text-slate-500">Section
                <select value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-medium normal-case text-slate-700">
                  <option value="all">All sections</option>
                  {sections.map((section) => <option key={section} value={section}>{section}</option>)}
                </select>
              </label>
            </div>
          </div>
          <div className="max-h-[560px] overflow-y-auto p-2">
            {loadingRoster && <p className="px-3 py-5 text-center text-xs text-slate-500">Loading roster…</p>}
            {!loadingRoster && visibleRoster.length === 0 && <p className="px-3 py-5 text-center text-xs text-slate-500">No students match these filters.</p>}
            {visibleRoster.map((student) => (
              <button key={student.institutionId} type="button" onClick={() => setSelectedId(student.institutionId)} className={`mb-1 w-full rounded-md border px-3 py-2.5 text-left transition ${selectedId === student.institutionId ? 'border-teal-300 bg-teal-50' : 'border-transparent hover:bg-slate-50'}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-bold text-slate-900">{student.firstName} {student.lastName}</span>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${student.isOnProbation ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                </span>
                <span className="mt-1 flex justify-between gap-2 font-mono text-[10px] text-slate-500">
                  <span>{student.institutionId}</span><span>Yr {student.yearLevel || '—'} · {student.section}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          {loadingWorkspace && <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading student workspace…</div>}
          {!loadingWorkspace && !workspace && <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center"><BookOpenCheck className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-700">Select a student to view their evaluation workspace.</p></div>}
          {workspace && draft && workspaceStudent && (
            <>
              <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Student identity</p>
                    <h2 className="mt-1 text-xl font-extrabold text-slate-900">{studentName || workspaceStudent.institutionId}</h2>
                    <p className="mt-1 font-mono text-xs text-slate-500">{workspaceStudent.institutionId} · @{workspaceStudent.username}</p>
                    <p className="mt-2 text-xs text-slate-600">{workspaceStudent.classification.program} · Year {workspaceStudent.yearLevel || '—'} · Section {workspaceStudent.section}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-md px-2.5 py-1.5 text-xs font-bold ${workspaceStudent.academicStatus.isOnProbation ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {statusLabel(workspaceStudent)}
                    </span>
                    {workspaceStudent.classification.studentType && <span className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">{workspaceStudent.classification.studentType}</span>}
                    {workspaceStudent.classification.isIP && <span className="rounded-md bg-amber-100 px-2.5 py-1.5 text-xs font-semibold text-amber-900">IP</span>}
                    {workspaceStudent.classification.isPWD && <span className="rounded-md bg-sky-100 px-2.5 py-1.5 text-xs font-semibold text-sky-900">PWD</span>}
                    {workspaceStudent.classification.isShifter && <span className="rounded-md bg-orange-100 px-2.5 py-1.5 text-xs font-semibold text-orange-900">Shifter</span>}
                    {workspaceStudent.classification.isTransferee && <span className="rounded-md bg-violet-100 px-2.5 py-1.5 text-xs font-semibold text-violet-900">Transferee</span>}
                  </div>
                </div>
              </section>

              <section aria-label="Key performance indicators" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {[
                  { label: 'Attendance rate', value: formatPercent(workspace.metrics.attendanceRate), icon: CalendarCheck2, color: 'text-sky-700' },
                  { label: 'Class percentile', value: formatPercent(workspace.metrics.classPercentile), icon: Activity, color: 'text-orange-700' },
                  { label: 'Current running grade', value: formatPercent(workspace.metrics.runningGrade), icon: BookOpenCheck, color: 'text-teal-700' },
                  { label: 'Submission rate', value: formatPercent(workspace.metrics.submissionRate), icon: ClipboardList, color: 'text-rose-700' },
                ].map((metric) => {
                  const Icon = metric.icon;
                  return <div key={metric.label} className="rounded-lg border border-slate-200 bg-white p-3"><Icon className={`h-4 w-4 ${metric.color}`} /><p className="mt-2 text-[10px] font-semibold text-slate-500">{metric.label}</p><p className="mt-0.5 text-lg font-extrabold text-slate-900">{metric.value}</p></div>;
                })}
              </section>

              <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div role="tablist" aria-label="Student evaluation sections" className="flex overflow-x-auto border-b border-slate-200 px-2 pt-2">
                  {tabItems.map((tab) => {
                    const Icon = tab.icon;
                    return <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-semibold ${activeTab === tab.id ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Icon className="h-4 w-4" />{tab.label}</button>;
                  })}
                </div>

                {activeTab === 'gradebook' && (
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div><h3 className="text-sm font-bold text-slate-900">Gradebook & Assessment Breakdown</h3><p className="mt-1 text-xs text-slate-500">Quiz, lab, exam, and other assessment scores for {draft.academicYear} · {draft.semester}.</p></div>
                      <button type="button" onClick={addAssessment} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /> Add assessment</button>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2">Assessment</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">Out of</th><th className="px-3 py-2">Submitted</th><th className="px-3 py-2">Remove</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {draft.assessments.map((assessment, index) => <tr key={assessment._id || `assessment-${index}`}>
                            <td className="px-3 py-2"><input aria-label="Assessment title" value={assessment.title} onChange={(event) => updateAssessment(index, 'title', event.target.value)} className="w-full min-w-32 rounded-md border border-slate-200 px-2 py-1.5" /></td>
                            <td className="px-3 py-2"><select aria-label="Assessment category" value={assessment.category} onChange={(event) => updateAssessment(index, 'category', event.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5"><option value="quiz">Quiz</option><option value="lab">Lab</option><option value="exam">Exam</option><option value="other">Other</option></select></td>
                            <td className="px-3 py-2"><input aria-label="Assessment score" type="number" min="0" max={assessment.possiblePoints} step="0.1" value={assessment.score} onChange={(event) => updateAssessment(index, 'score', Number(event.target.value))} className="w-20 rounded-md border border-slate-200 px-2 py-1.5" /></td>
                            <td className="px-3 py-2"><input aria-label="Assessment possible points" type="number" min="1" step="0.1" value={assessment.possiblePoints} onChange={(event) => updateAssessment(index, 'possiblePoints', Number(event.target.value))} className="w-20 rounded-md border border-slate-200 px-2 py-1.5" /></td>
                            <td className="px-3 py-2"><input aria-label="Assessment submitted" type="checkbox" checked={assessment.submitted} onChange={(event) => updateAssessment(index, 'submitted', event.target.checked)} className="h-4 w-4 accent-teal-700" /></td>
                            <td className="px-3 py-2"><button type="button" aria-label="Remove assessment" onClick={() => setDraft((current) => current ? { ...current, assessments: current.assessments.filter((_, itemIndex) => itemIndex !== index) } : current)} className="rounded p-1 text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></td>
                          </tr>)}
                          {draft.assessments.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No assessments recorded. Add one to begin the gradebook.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 flex justify-end"><button type="button" onClick={saveProgress} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-teal-800 px-4 py-2 text-xs font-bold text-white hover:bg-teal-900 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save gradebook'}</button></div>
                  </div>
                )}

                {activeTab === 'attendance' && (
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-900">Attendance & Participation Log</h3><p className="mt-1 text-xs text-slate-500">Date-by-date attendance, participation notes, and excuse-letter references.</p></div><button type="button" onClick={addAttendance} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /> Add entry</button></div>
                    <div className="mt-4 space-y-3">
                      {draft.attendanceLogs.map((entry, index) => <div key={entry._id || `attendance-${index}`} className="grid gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-2 xl:grid-cols-[140px_130px_minmax(0,1fr)_minmax(0,1fr)_36px]">
                        <label className="text-[10px] font-semibold text-slate-500">Date<input type="date" value={String(entry.date).slice(0, 10)} onChange={(event) => setDraft((current) => current ? { ...current, attendanceLogs: current.attendanceLogs.map((item, itemIndex) => itemIndex === index ? { ...item, date: event.target.value } : item) } : current)} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-800" /></label>
                        <label className="text-[10px] font-semibold text-slate-500">Status<select value={entry.status} onChange={(event) => setDraft((current) => current ? { ...current, attendanceLogs: current.attendanceLogs.map((item, itemIndex) => itemIndex === index ? { ...item, status: event.target.value as typeof item.status } : item) } : current)} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800"><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option><option value="excused">Excused</option></select></label>
                        <label className="text-[10px] font-semibold text-slate-500">Participation notes<input value={entry.notes || ''} onChange={(event) => setDraft((current) => current ? { ...current, attendanceLogs: current.attendanceLogs.map((item, itemIndex) => itemIndex === index ? { ...item, notes: event.target.value } : item) } : current)} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-800" /></label>
                        <label className="text-[10px] font-semibold text-slate-500">Excuse letter reference<input value={entry.excuseLetter || ''} onChange={(event) => setDraft((current) => current ? { ...current, attendanceLogs: current.attendanceLogs.map((item, itemIndex) => itemIndex === index ? { ...item, excuseLetter: event.target.value } : item) } : current)} placeholder="Optional" className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-800" /></label>
                        <button type="button" aria-label="Remove attendance entry" onClick={() => setDraft((current) => current ? { ...current, attendanceLogs: current.attendanceLogs.filter((_, itemIndex) => itemIndex !== index) } : current)} className="self-end rounded p-2 text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                      </div>)}
                      {draft.attendanceLogs.length === 0 && <p className="rounded-md bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">No attendance entries recorded.</p>}
                    </div>
                    <div className="mt-4 flex justify-end"><button type="button" onClick={saveProgress} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-teal-800 px-4 py-2 text-xs font-bold text-white hover:bg-teal-900 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save attendance'}</button></div>
                  </div>
                )}

                {activeTab === 'remarks' && (
                  <div className="grid gap-6 p-4 lg:grid-cols-2 sm:p-5">
                    <section>
                      <div className="flex items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-slate-900">Competency rubrics</h3><p className="mt-1 text-xs text-slate-500">Record a rating and supporting notes.</p></div><button type="button" onClick={addRubric} aria-label="Add rubric criterion" className="rounded-md border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4" /></button></div>
                      <div className="mt-3 space-y-3">
                        {draft.rubricScores.map((rubric, index) => <div key={rubric._id || `rubric-${index}`} className="space-y-2 rounded-md border border-slate-200 p-3">
                          <input aria-label="Competency" value={rubric.competency} onChange={(event) => setDraft((current) => current ? { ...current, rubricScores: current.rubricScores.map((item, itemIndex) => itemIndex === index ? { ...item, competency: event.target.value } : item) } : current)} placeholder="Competency" className="w-full rounded-md border border-slate-200 px-2.5 py-2 text-xs" />
                          <div className="flex items-center gap-3"><label className="text-xs text-slate-600">Rating<select value={rubric.rating} onChange={(event) => setDraft((current) => current ? { ...current, rubricScores: current.rubricScores.map((item, itemIndex) => itemIndex === index ? { ...item, rating: Number(event.target.value) } : item) } : current)} className="ml-2 rounded-md border border-slate-200 bg-white px-2 py-1.5"><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option></select> / 5</label><button type="button" aria-label="Remove rubric criterion" onClick={() => setDraft((current) => current ? { ...current, rubricScores: current.rubricScores.filter((_, itemIndex) => itemIndex !== index) } : current)} className="ml-auto rounded p-1 text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></div>
                          <textarea aria-label="Rubric notes" value={rubric.notes || ''} onChange={(event) => setDraft((current) => current ? { ...current, rubricScores: current.rubricScores.map((item, itemIndex) => itemIndex === index ? { ...item, notes: event.target.value } : item) } : current)} placeholder="Evidence and feedback" className="min-h-16 w-full rounded-md border border-slate-200 px-2.5 py-2 text-xs" />
                        </div>)}
                        {draft.rubricScores.length === 0 && <p className="rounded-md bg-slate-50 p-4 text-xs text-slate-500">No rubric ratings recorded.</p>}
                      </div>
                    </section>
                    <section>
                      <div className="flex items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-slate-900">Faculty remarks</h3><p className="mt-1 text-xs text-slate-500">Qualitative feedback and internal faculty notes.</p></div><button type="button" onClick={addRemark} aria-label="Add faculty remark" className="rounded-md border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4" /></button></div>
                      <div className="mt-3 space-y-2">
                        {draft.facultyRemarks.map((remark, index) => <div key={remark._id || `remark-${index}`} className="flex gap-2"><textarea aria-label="Faculty remark" value={remark.text} onChange={(event) => setDraft((current) => current ? { ...current, facultyRemarks: current.facultyRemarks.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item) } : current)} placeholder="Write a remark" className="min-h-16 flex-1 rounded-md border border-slate-200 px-2.5 py-2 text-xs" /><button type="button" aria-label="Remove faculty remark" onClick={() => setDraft((current) => current ? { ...current, facultyRemarks: current.facultyRemarks.filter((_, itemIndex) => itemIndex !== index) } : current)} className="self-start rounded p-1 text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></div>)}
                        {draft.facultyRemarks.length === 0 && <p className="rounded-md bg-slate-50 p-4 text-xs text-slate-500">No faculty remarks recorded.</p>}
                      </div>
                      <label className="mt-4 block text-xs font-semibold text-slate-700">Internal notes<textarea value={draft.internalNotes} onChange={(event) => setDraft((current) => current ? { ...current, internalNotes: event.target.value } : current)} placeholder="Private faculty notes" className="mt-1 min-h-24 w-full rounded-md border border-slate-200 px-2.5 py-2 text-xs font-normal" /></label>
                    </section>
                    <div className="flex justify-end lg:col-span-2"><button type="button" onClick={saveProgress} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-teal-800 px-4 py-2 text-xs font-bold text-white hover:bg-teal-900 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save remarks & rubrics'}</button></div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="space-y-5 p-4 sm:p-5">
                    <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><FileClock className="h-4 w-4 shrink-0" /><p>Prerequisite checks below are inferred from recorded subject results; no curriculum-specific prerequisite map is configured.</p></div>
                    <div className="flex flex-col gap-3 rounded-md border border-slate-200 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"><span className="text-xs font-semibold text-slate-600">Latest-period GWA{latestAcademicPeriod ? ` · ${latestAcademicPeriod.academicYear} · ${latestAcademicPeriod.semester}` : ''}<small className="mt-1 block font-normal text-slate-500">Historical cumulative: Overall {formatAcademicGwa(historicalOverallGwa)} · Major {formatAcademicGwa(workspace.majorSubjectGwa)}</small></span><span className="flex gap-5"><span><small className="block text-[10px] text-slate-500">Overall</small><strong className="text-lg font-extrabold text-slate-900">{formatAcademicGwa(latestAcademicPeriod?.overallGwa)}</strong></span><span><small className="block text-[10px] text-slate-500">Major</small><strong className="text-lg font-extrabold text-slate-900">{formatAcademicGwa(latestAcademicPeriod?.majorSubjectGwa)}</strong></span></span></div>
                    {workspace.academicRecords.length === 0 && <p className="rounded-md bg-slate-50 p-5 text-center text-xs text-slate-500">No past semester records are available.</p>}
                    {workspace.academicRecords.map((term) => (
                      <section key={`${term.academicYear}-${term.semester}`} className="overflow-hidden rounded-md border border-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2"><h3 className="text-xs font-bold text-slate-800">{term.academicYear} · {term.semester}</h3><span className="text-[10px] font-semibold text-slate-500">Overall {formatAcademicGwa(resolvePeriodGwas(term).overallGwa)} · Major {formatAcademicGwa(resolvePeriodGwas(term).majorSubjectGwa)}</span></div>
                        <div className="overflow-x-auto"><table className="w-full min-w-[550px] text-left text-xs"><thead className="border-y border-slate-200 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Units</th><th className="px-3 py-2">Grade</th><th className="px-3 py-2">Prerequisite check</th></tr></thead><tbody className="divide-y divide-slate-100">{term.subjects.map((subject) => {
                          const passed = subject.grade > 0 && subject.grade <= 3 && subject.status.toLowerCase() !== 'dropped';
                          return <tr key={subject.subjectCode}><td className="px-3 py-2"><span className="font-mono font-semibold">{subject.subjectCode}</span><span className="ml-2 text-slate-700">{subject.subjectName}</span></td><td className="px-3 py-2">{subject.isMajor ? 'Major' : 'Non-major'}</td><td className="px-3 py-2">{subject.units}</td><td className="px-3 py-2 font-semibold">{subject.grade.toFixed(2)}</td><td className="px-3 py-2"><span className={`rounded px-2 py-1 text-[10px] font-bold ${passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{passed ? 'Met' : 'Outstanding'}</span></td></tr>;
                        })}</tbody></table></div>
                      </section>
                    ))}
                    <div className="rounded-md border border-slate-200 p-3"><h3 className="text-xs font-bold text-slate-800">Current semester assessments</h3><div className="mt-2 flex flex-wrap gap-2">{draft.assessments.map((assessment, index) => <span key={assessment._id || index} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] text-slate-700">{assessment.title || 'Untitled'} · {assessment.category}</span>)}{draft.assessments.length === 0 && <span className="text-xs text-slate-500">No current assessments recorded.</span>}</div></div>
                  </div>
                )}
              </section>

              {message && <p role="status" className="text-right text-xs font-semibold text-emerald-700">{message}</p>}
              {selectedRosterStudent?.isOnProbation && <p className="text-xs text-rose-700">Academic probation is currently recorded for this student.</p>}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
