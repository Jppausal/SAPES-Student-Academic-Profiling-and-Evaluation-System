import React, { useEffect, useMemo, useState } from 'react';
import { FacultyRosterStudent, fetchFacultyEvaluationRoster } from '../../lib/api';
import { TECHNOLOGY_PROGRAMS } from '../../lib/academicPrograms';
import { ATTENTION_THRESHOLD, average, buildAttentionRows, buildSectionRows } from '../../lib/facultyAttention';
import { Badge } from '../common/Badge';
import type { EvaluationTarget, FacultyPage } from '../../types';
import { ArrowRight, BookOpen, ClipboardCheck, FileText, GraduationCap, Search, Users } from 'lucide-react';
import campusBuilding from '../../assets/branding/cot building.jpg';

const formatMetric = (value: number | null) => (value === null ? '—' : `${value}%`);

interface FacultyDashboardPageProps {
  facultyName: string;
  onNavigate: (page: FacultyPage) => void;
  onOpenEvaluation: (target: EvaluationTarget) => void;
}

export const FacultyDashboardPage: React.FC<FacultyDashboardPageProps> = ({ facultyName, onNavigate, onOpenEvaluation }) => {
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
  const recentStudents = visible.slice(0, 5);
  const awaitingEvaluation = attentionRows.length;
  const pendingEnrollment = visible.filter((student) => student.enrollmentStatus.toLowerCase() === 'pending').length;
  const evaluatedProfiles = visible.filter((student) => (
    student.metrics.attendanceRate !== null
    || student.metrics.submissionRate !== null
    || student.metrics.runningGrade !== null
  )).length;
  const firstName = facultyName.trim().split(/\s+/)[0] || 'Faculty';
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());

  return (
    <div className="space-y-6">
      <header className="grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex min-h-32 flex-col justify-center px-5 py-5 sm:px-7">
          <p className="text-xs font-semibold text-brand-700">Faculty overview</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Good day, {firstName}!</h1>
          <p className="mt-1 text-sm text-slate-600">Here’s an overview of your students and academic progress.</p>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <FileText className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
            {today}
          </p>
        </div>
        <img src={campusBuilding} alt="College of Technologies campus building" className="hidden h-full min-h-32 w-full object-cover md:block" />
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
          <section aria-label="Summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total students', value: stats.total, hint: 'Active profiles in your department', icon: Users, tone: 'bg-blue-100 text-blue-700' },
              { label: 'Profiles awaiting evaluation', value: awaitingEvaluation, hint: 'Need faculty evaluation', icon: ClipboardCheck, tone: 'bg-amber-100 text-amber-700' },
              { label: 'Pending enrollment decisions', value: pendingEnrollment, hint: 'Awaiting an enrollment decision', icon: GraduationCap, tone: 'bg-rose-100 text-rose-700' },
              { label: 'Evaluated profiles', value: evaluatedProfiles, hint: 'Faculty evaluation recorded', icon: BookOpen, tone: 'bg-emerald-100 text-emerald-700' },
            ].map((card) => (
              <div key={card.label} className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">{card.label}</p>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900">{card.value}</p>
                  </div>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${card.tone}`}>
                    <card.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-2 text-[10px] text-slate-500">{card.hint}</p>
              </div>
            ))}
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <section aria-labelledby="recent-students-heading" className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <h2 id="recent-students-heading" className="text-sm font-bold text-slate-900">Recent students</h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">Recently updated profiles in your department.</p>
                </div>
                <button type="button" onClick={() => onNavigate('student-search')} className="text-[11px] font-semibold text-brand-700 hover:text-brand-900">View all</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500">
                      <th scope="col" className="px-4 py-2.5">Student ID</th>
                      <th scope="col" className="px-4 py-2.5">Name</th>
                      <th scope="col" className="px-4 py-2.5">Course</th>
                      <th scope="col" className="px-4 py-2.5">Year</th>
                      <th scope="col" className="px-4 py-2.5">Enrollment status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentStudents.map((student) => (
                      <tr key={student.institutionId} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-4 py-2.5 font-mono text-[10px] text-slate-600">{student.institutionId}</td>
                        <td className="px-4 py-2.5 text-xs font-semibold text-slate-900">{student.firstName} {student.lastName}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-700">{student.program}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-700">{student.yearLevel || '—'}</td>
                        <td className="px-4 py-2.5"><Badge variant={student.enrollmentStatus.toLowerCase() === 'approved' ? 'success' : 'warning'} size="sm">{student.enrollmentStatus || 'Pending'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-labelledby="quick-actions-heading" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 id="quick-actions-heading" className="text-sm font-bold text-slate-900">Quick actions</h2>
              <div className="mt-3 space-y-2">
                {[
                  { label: 'Search department students', icon: Search, page: 'student-search' as FacultyPage },
                  { label: 'Evaluate academic standing', icon: ClipboardCheck, page: 'evaluations' as FacultyPage },
                  { label: 'View academic records', icon: BookOpen, page: 'student-records' as FacultyPage },
                ].map((action) => (
                  <button key={action.label} type="button" onClick={() => onNavigate(action.page)} className="flex w-full items-center gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold text-slate-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 text-brand-700"><action.icon className="h-4 w-4" aria-hidden="true" /></span>
                    <span className="flex-1">{action.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
          </div>

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
