import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BarChart3, CheckCircle2, ClipboardList, Layers3, Search, Users } from 'lucide-react';
import { FacultyRosterStudent, fetchFacultyEvaluationRoster } from '../../lib/api';
import { TECHNOLOGY_PROGRAMS } from '../../lib/academicPrograms';
import type { EvaluationTarget } from '../../types';
import { StudentEvaluationPanel } from './StudentEvaluationPanel';

interface FacultyEvaluationPageProps {
  initialTarget?: EvaluationTarget | null;
  fixedProgram?: string;
}

export const FacultyEvaluationPage: React.FC<FacultyEvaluationPageProps> = ({ initialTarget, fixedProgram }) => {
  const [program, setProgram] = useState<string>(fixedProgram || initialTarget?.program || TECHNOLOGY_PROGRAMS[0].value);
  const [roster, setRoster] = useState<FacultyRosterStudent[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [selectedSection, setSelectedSection] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const targetIdRef = useRef(initialTarget?.institutionId || '');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setSelectedId('');
    setShowStudentDetails(false);
    setSelectedSection('all');
    fetchFacultyEvaluationRoster(program)
      .then((students) => {
        if (!active) return;
        setRoster(students);
        const targetId = targetIdRef.current;
        const targetIsInRoster = targetId && students.some((student) => student.institutionId === targetId);
        setSelectedId(targetIsInRoster ? targetId : '');
        setShowStudentDetails(Boolean(targetIsInRoster));
      })
      .catch((requestError) => {
        if (!active) return;
        setRoster([]);
        setError(requestError instanceof Error ? requestError.message : 'Unable to load the course roster.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [program]);

  const sections = useMemo(
    () => [...new Set(roster.map((student) => student.section).filter((section) => section !== 'Unassigned'))].sort(),
    [roster]
  );
  const evaluatedStudents = useMemo(
    () => roster.filter((student) => (
      student.metrics.attendanceRate !== null
      || student.metrics.submissionRate !== null
      || student.metrics.runningGrade !== null
    )),
    [roster]
  );
  const pendingStudents = roster.filter((student) => !evaluatedStudents.some((evaluated) => evaluated.institutionId === student.institutionId));
  const visibleRoster = roster.filter((student) => {
    const matchesSection = selectedSection === 'all' || student.section === selectedSection;
    const matchesSearch = `${student.firstName} ${student.lastName} ${student.institutionId}`
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase());
    const isEvaluated = evaluatedStudents.some((evaluated) => evaluated.institutionId === student.institutionId);
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'completed' ? isEvaluated : !isEvaluated);
    return matchesSection && matchesSearch && matchesStatus;
  });
  const selectedStudent = visibleRoster.find((student) => student.institutionId === selectedId);

  const sectionOptions = [
    { id: 'all' as const, label: 'All students', count: roster.length, icon: Users },
    { id: 'pending' as const, label: 'Pending evaluation', count: pendingStudents.length, icon: ClipboardList },
    { id: 'completed' as const, label: 'Completed evaluations', count: evaluatedStudents.length, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Faculty workspace</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-brand-950">Student evaluations</h1>
          <p className="mt-1 text-sm text-slate-600">Review student profiles and record enrollment eligibility.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative block min-w-64 flex-1 sm:flex-none">
            <span className="sr-only">Search student name or ID</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-700" aria-hidden="true" />
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSelectedId('');
                setShowStudentDetails(false);
              }}
              placeholder="Search student name or ID..."
              className="h-10 w-full rounded-xl border border-brand-100 bg-white pl-9 pr-3 text-xs text-slate-800 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="sr-only" htmlFor="evaluation-status-filter">Evaluation status</label>
          <select
            id="evaluation-status-filter"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as typeof statusFilter);
              setSelectedId('');
              setShowStudentDetails(false);
            }}
            className="h-10 rounded-xl border border-brand-100 bg-white px-3 text-xs font-semibold text-brand-950 shadow-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending evaluation</option>
            <option value="completed">Completed evaluations</option>
          </select>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="self-start overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm xl:sticky xl:top-24">
          <div className="bg-brand-950 px-5 py-5 text-white">
            <div className="flex items-center gap-3">
              <Layers3 className="h-5 w-5 text-blue-200" aria-hidden="true" />
              <h2 className="text-sm font-bold">Evaluation sections</h2>
            </div>
            <p className="mt-1 text-xs text-blue-100">Choose a course and evaluation group.</p>
          </div>
          <div className="p-3">
            <label className="mb-3 block text-xs font-semibold text-slate-600">
              Course
              <select
                value={program}
                onChange={(event) => setProgram(event.target.value)}
                disabled={Boolean(fixedProgram)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-brand-950 disabled:bg-slate-50"
              >
                {TECHNOLOGY_PROGRAMS.filter((item) => !fixedProgram || item.value === fixedProgram).map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <div className="space-y-1">
              {sectionOptions.map(({ id, label, count, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatusFilter(id)}
                  aria-pressed={statusFilter === id}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-xs font-semibold transition-colors ${
                    statusFilter === id
                      ? 'bg-brand-50 text-brand-900 shadow-sm ring-1 ring-brand-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-brand-900'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Icon className={`h-4 w-4 shrink-0 ${statusFilter === id ? 'text-brand-700' : 'text-slate-400'}`} aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusFilter === id ? 'bg-white text-brand-800' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                </button>
              ))}
            </div>
            <div className="my-3 border-t border-slate-100" />
            <label className="block text-xs font-semibold text-slate-600">
              Section
              <select
                value={selectedSection}
                onChange={(event) => {
                  setSelectedSection(event.target.value);
                  setSelectedId('');
                  setShowStudentDetails(false);
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"
              >
                <option value="all">All sections</option>
                {sections.map((section) => <option key={section} value={section}>{section}</option>)}
              </select>
            </label>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
              <BarChart3 className="h-4 w-4 text-brand-700" aria-hidden="true" />
              <span>{visibleRoster.length} student{visibleRoster.length === 1 ? '' : 's'} shown</span>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          {loading && <div role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading evaluation roster…</div>}
          {!loading && visibleRoster.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
              No students match the current search and filters.
            </div>
          )}
          {!loading && visibleRoster.length > 0 && showStudentDetails && selectedStudent ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedId('');
                  setShowStudentDetails(false);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to students
              </button>
              <StudentEvaluationPanel key={selectedStudent.institutionId} institutionId={selectedStudent.institutionId} showEvaluationDetails={false} />
            </div>
          ) : !loading && visibleRoster.length > 0 ? (
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              {visibleRoster.slice(0, 4).map((student) => {
                const isEvaluated = evaluatedStudents.some((evaluated) => evaluated.institutionId === student.institutionId);
                return (
                  <button
                    key={student.institutionId}
                    type="button"
                    onClick={() => {
                      setSelectedId(student.institutionId);
                      setShowStudentDetails(true);
                    }}
                    aria-pressed={selectedId === student.institutionId}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      selectedId === student.institutionId ? 'border-brand-300 bg-brand-50 shadow-sm' : 'border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50/40'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-brand-950">{student.firstName} {student.lastName}</span>
                      <span className="mt-1 block truncate text-[11px] text-slate-500">{student.institutionId} · {student.section}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${isEvaluated ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {isEvaluated ? 'Completed' : 'Pending'}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
};
