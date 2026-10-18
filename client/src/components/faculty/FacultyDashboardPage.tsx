import React, { useEffect, useMemo, useState } from 'react';
import { FacultyRosterStudent, fetchFacultyEvaluationRoster } from '../../lib/api';
import { TECHNOLOGY_PROGRAMS } from '../../lib/academicPrograms';
import { ATTENTION_THRESHOLD, average, buildAttentionRows, buildSectionRows } from '../../lib/facultyAttention';
import { Badge } from '../common/Badge';
import type { EvaluationTarget, FacultyPage } from '../../types';

const formatAverage = (value: number | null) => (value === null ? 'N/A' : `${value}%`);
const formatMetric = (value: number | null) => (value === null ? '—' : `${value}%`);

interface FacultyDashboardPageProps {
  onNavigate: (page: FacultyPage) => void;
  onOpenEvaluation: (target: EvaluationTarget) => void;
}

export const FacultyDashboardPage: React.FC<FacultyDashboardPageProps> = ({ onNavigate, onOpenEvaluation }) => {
  const [program, setProgram] = useState<string>(TECHNOLOGY_PROGRAMS[0].value);
  const [section, setSection] = useState('all');
  const [roster, setRoster] = useState<FacultyRosterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setSection('all');
    fetchFacultyEvaluationRoster(program)
      .then((students) => {
        if (active) setRoster(students);
      })
      .catch((requestError) => {
        if (!active) return;
        setRoster([]);
        setError(requestError instanceof Error ? requestError.message : 'Unable to load the course roster.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [program]);

  const sections = useMemo(
    () => [...new Set(roster.map((student) => student.section).filter((value) => value !== 'Unassigned'))].sort(),
    [roster]
  );

  const visible = useMemo(
    () => (section === 'all' ? roster : roster.filter((student) => student.section === section)),
    [roster, section]
  );

  const stats = useMemo(() => ({
    total: visible.length,
    sections: new Set(visible.map((student) => student.section)).size,
    probation: visible.filter((student) => student.isOnProbation).length,
    attendance: average(visible.map((student) => student.metrics.attendanceRate)),
    submission: average(visible.map((student) => student.metrics.submissionRate)),
    grade: average(visible.map((student) => student.metrics.runningGrade)),
  }), [visible]);

  const attentionRows = useMemo(() => buildAttentionRows(visible), [visible]);

  const sectionRows = useMemo(() => buildSectionRows(visible), [visible]);

  const summaryCards = [
    { label: 'Assigned Students', value: String(stats.total), hint: `${stats.sections} section${stats.sections === 1 ? '' : 's'} in scope` },
    { label: 'On Probation', value: String(stats.probation), hint: 'Academic standing', alert: stats.probation > 0 },
    { label: 'Avg Attendance', value: formatAverage(stats.attendance), hint: 'Across recorded sessions' },
    { label: 'Avg Submission Rate', value: formatAverage(stats.submission), hint: 'Assessment submissions' },
    { label: 'Avg Running Grade', value: formatAverage(stats.grade), hint: 'Percent of scored points' },
  ];

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900">Faculty Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Roster scope, students needing attention, and section performance for your program.</p>
      </header>

      <section aria-label="Roster filters" className="flex flex-wrap items-end gap-2">
        <div className="flex flex-wrap gap-2">
          {TECHNOLOGY_PROGRAMS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setProgram(item.value)}
              aria-pressed={program === item.value}
              className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold ${program === item.value ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="ml-auto block text-xs font-semibold text-slate-600">
          Section
          <select
            value={section}
            onChange={(event) => setSection(event.target.value)}
            className="mt-1 w-48 rounded-md border border-slate-200 bg-white px-2 py-2 text-xs"
          >
            <option value="all">All sections</option>
            {sections.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </section>

      {loading && (
        <p role="status" className="rounded-lg border border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-500">Loading roster…</p>
      )}

      {!loading && error && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No students found for this program{section === 'all' ? '' : ' and section'}.
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <>
          <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold text-slate-500">{card.label}</p>
                <p className={`mt-1 text-2xl font-extrabold ${card.alert ? 'text-rose-700' : 'text-slate-900'}`}>{card.value}</p>
                <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
              </div>
            ))}
          </section>

          <section aria-labelledby="attention-heading" className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <h2 id="attention-heading" className="text-sm font-bold text-slate-900">Needs Attention</h2>
              <p className="mt-1 text-xs text-slate-500">
                Flagged when attendance, submission, or running grade is below {ATTENTION_THRESHOLD}% (or on probation / no records yet).
              </p>
            </div>
            {attentionRows.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">No students currently flagged in this scope.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      <th scope="col" className="px-4 py-2.5">Student</th>
                      <th scope="col" className="px-4 py-2.5">Section</th>
                      <th scope="col" className="px-4 py-2.5">Attendance</th>
                      <th scope="col" className="px-4 py-2.5">Submission</th>
                      <th scope="col" className="px-4 py-2.5">Running grade</th>
                      <th scope="col" className="px-4 py-2.5">Flags</th>
                      <th scope="col" className="px-4 py-2.5"><span className="sr-only">Action</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {attentionRows.map(({ student, reasons }) => (
                      <tr key={student.institutionId} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-4 py-3">
                          <span className="block text-xs font-bold text-slate-900">{student.firstName} {student.lastName}</span>
                          <span className="mt-0.5 block font-mono text-[10px] text-slate-500">{student.institutionId}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700">
                          {student.section}
                          <span className="mt-0.5 block text-[10px] text-slate-500">Year {student.yearLevel || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700">{formatMetric(student.metrics.attendanceRate)}</td>
                        <td className="px-4 py-3 text-xs text-slate-700">{formatMetric(student.metrics.submissionRate)}</td>
                        <td className="px-4 py-3 text-xs text-slate-700">{formatMetric(student.metrics.runningGrade)}</td>
                        <td className="px-4 py-3">
                          <span className="flex flex-wrap gap-1.5">
                            {reasons.map((reason) => <Badge key={reason.label} variant={reason.variant} size="sm">{reason.label}</Badge>)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onOpenEvaluation({ institutionId: student.institutionId, program })}
                            aria-label={`View evaluation for ${student.firstName} ${student.lastName}`}
                            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                          >
                            View evaluation
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-labelledby="sections-heading" className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <h2 id="sections-heading" className="text-sm font-bold text-slate-900">Sections</h2>
              <p className="mt-1 text-xs text-slate-500">Average performance per section.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-2.5">Section</th>
                    <th scope="col" className="px-4 py-2.5">Students</th>
                      <th scope="col" className="px-4 py-2.5">Avg Attendance</th>
                      <th scope="col" className="px-4 py-2.5">Avg Running Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionRows.map((row) => (
                    <tr key={row.name} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-3 text-xs font-semibold text-slate-900">{row.name}</td>
                      <td className="px-4 py-3 text-xs text-slate-700">{row.count}</td>
                      <td className="px-4 py-3 text-xs text-slate-700">{formatMetric(row.attendance)}</td>
                      <td className="px-4 py-3 text-xs text-slate-700">{formatMetric(row.grade)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
