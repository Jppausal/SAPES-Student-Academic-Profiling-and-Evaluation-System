import React, { useEffect, useMemo, useState } from 'react';
import { FacultyRosterStudent, fetchFacultyEvaluationRoster } from '../../lib/api';
import { TECHNOLOGY_PROGRAMS } from '../../lib/academicPrograms';
import { StudentEvaluationPanel } from './StudentEvaluationPanel';

export const FacultyEvaluationPage: React.FC = () => {
  const [program, setProgram] = useState<string>(TECHNOLOGY_PROGRAMS[0].value);
  const [roster, setRoster] = useState<FacultyRosterStudent[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setSelectedId('');
    setSelectedSection('all');
    fetchFacultyEvaluationRoster(program)
      .then((students) => {
        if (!active) return;
        setRoster(students);
        setSelectedId(students[0]?.institutionId || '');
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
  const visibleRoster = roster.filter((student) => selectedSection === 'all' || student.section === selectedSection);

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900">Student evaluations</h1>
        <p className="mt-1 text-sm text-slate-600">Choose a student to review and update their evaluation.</p>
      </header>

      <section aria-label="Select course" className="flex gap-2 overflow-x-auto pb-1">
        {TECHNOLOGY_PROGRAMS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setProgram(item.value)}
            aria-pressed={program === item.value}
            className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold ${program === item.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            {item.label}
          </button>
        ))}
      </section>

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-900">Course roster</h2>
            <label className="mt-3 block text-xs font-semibold text-slate-600">
              Section
              <select
                value={selectedSection}
                onChange={(event) => {
                  setSelectedSection(event.target.value);
                  setSelectedId('');
                }}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs"
              >
                <option value="all">All sections</option>
                {sections.map((section) => <option key={section} value={section}>{section}</option>)}
              </select>
            </label>
          </div>
          <div className="max-h-[560px] overflow-y-auto p-2">
            {loading && <p role="status" className="px-3 py-5 text-center text-xs text-slate-500">Loading roster…</p>}
            {!loading && visibleRoster.length === 0 && <p className="px-3 py-5 text-center text-xs text-slate-500">No students found for this course and section.</p>}
            {visibleRoster.map((student) => (
              <button
                key={student.institutionId}
                type="button"
                onClick={() => setSelectedId(student.institutionId)}
                aria-pressed={selectedId === student.institutionId}
                className={`mb-1 w-full rounded-md border px-3 py-2.5 text-left ${selectedId === student.institutionId ? 'border-teal-300 bg-teal-50' : 'border-transparent hover:bg-slate-50'}`}
              >
                <span className="block truncate text-xs font-bold text-slate-900">{student.firstName} {student.lastName}</span>
                <span className="mt-1 block font-mono text-[10px] text-slate-500">{student.institutionId} · Yr {student.yearLevel || '—'} · {student.section}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="min-w-0">
          {selectedId
            ? <StudentEvaluationPanel key={selectedId} institutionId={selectedId} showEvaluationDetails={false} />
            : <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Select a student to open their evaluation.</div>}
        </main>
      </div>
    </div>
  );
};
