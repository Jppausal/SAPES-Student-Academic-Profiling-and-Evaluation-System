import React, { useEffect, useMemo, useState } from 'react';
import { FacultyRosterStudent, fetchFacultyEvaluationRoster } from '../../lib/api';
import { TECHNOLOGY_PROGRAMS } from '../../lib/academicPrograms';
import { ATTENTION_THRESHOLD, average, buildAttentionRows, buildSectionRows } from '../../lib/facultyAttention';
import { Badge } from '../common/Badge';
import { RollingNumber } from '../common/RollingNumber';
import type { EvaluationTarget, FacultyPage } from '../../types';
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, Clock3, GraduationCap, Search, Users } from 'lucide-react';
import { FacultyDashboardHeader } from './FacultyDashboardHeader';

const formatMetric = (value: number | null) => (value === null ? '—' : `${value}%`);

interface FacultyDashboardPageProps {
  facultyName: string;
  facultyId?: string;
  department?: string;
  onNavigate: (page: FacultyPage) => void;
  onOpenEvaluation: (target: EvaluationTarget) => void;
}

export const FacultyDashboardPage: React.FC<FacultyDashboardPageProps> = ({ facultyName, facultyId, department, onNavigate, onOpenEvaluation }) => {
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
  return (
    <div className="space-y-6">
      <FacultyDashboardHeader facultyName={facultyName} facultyId={facultyId} department={department} />

      <section aria-label="Roster filters" className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {TECHNOLOGY_PROGRAMS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setProgram(item.value)}
              aria-pressed={program === item.value}
              className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${program === item.value ? 'border-brand-700 bg-brand-700 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50'}`}
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
          <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total Students', value: stats.total, hint: 'Active profiles in your department', icon: Users, tone: 'bg-blue-100 text-blue-700', ghostTone: 'text-blue-100', border: 'border-blue-500' },
              { label: 'Pending Evaluations', value: awaitingEvaluation, hint: 'Requires faculty action', icon: ClipboardCheck, statusIcon: AlertTriangle, statusTone: 'text-amber-600', tone: 'bg-blue-100 text-blue-700', ghostTone: 'text-blue-100', border: 'border-amber-500' },
              { label: 'Pending Enrollment', value: pendingEnrollment, hint: 'Awaiting an enrollment decision', icon: GraduationCap, statusIcon: Clock3, statusTone: 'text-brand-600', tone: 'bg-blue-100 text-blue-700', ghostTone: 'text-blue-100', border: 'border-brand-600' },
              { label: 'Completed Evaluations', value: evaluatedProfiles, hint: 'Faculty evaluation recorded', icon: BookOpen, statusIcon: CheckCircle2, statusTone: 'text-emerald-600', tone: 'bg-blue-100 text-blue-700', ghostTone: 'text-blue-100', border: 'border-emerald-600' },
            ].map((card) => (
              <div key={card.label} className={`relative min-h-[180px] overflow-hidden rounded-2xl border border-slate-200 border-b-4 ${card.border} bg-white px-5 py-4 shadow-sm`}>
                <card.icon className={`pointer-events-none absolute bottom-3 right-3 h-20 w-20 ${card.ghostTone}`} aria-hidden="true" />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-brand-900">{card.label}</p>
                    <p className="mt-2 text-3xl font-extrabold tracking-tight text-brand-900"><RollingNumber value={card.value} /></p>
                  </div>
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.tone}`}>
                    <card.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <p className={`relative mt-3 flex items-center gap-1.5 text-[11px] font-semibold ${card.statusTone || 'text-slate-500'}`}>
                  {card.statusIcon && <card.statusIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                  {card.hint}
                </p>
              </div>
            ))}
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
            <section aria-labelledby="recent-students-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-900 text-white">
                    <Users className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                  <h2 id="recent-students-heading" className="text-base font-extrabold text-brand-900">Recent Students</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Recently updated profiles and evaluations.</p>
                  </div>
                </div>
                <button type="button" onClick={() => onNavigate('student-search')} className="text-xs font-bold text-brand-700 hover:text-brand-900">View all students <ArrowRight className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" /></button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-brand-50/70 text-[10px] font-bold text-brand-800">
                      <th scope="col" className="px-4 py-2.5">Student ID</th>
                      <th scope="col" className="px-4 py-2.5">Name</th>
                      <th scope="col" className="px-4 py-2.5">Course</th>
                      <th scope="col" className="px-4 py-2.5">Year</th>
                      <th scope="col" className="px-4 py-2.5">Enrollment status</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    {recentStudents.map((student) => (
                      <tr key={student.institutionId} className="border-b border-slate-100 last:border-b-0 hover:bg-brand-50/40">
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

            <section aria-labelledby="quick-actions-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-900 text-white"><ArrowRight className="h-5 w-5" aria-hidden="true" /></span>
                <div>
                  <h2 id="quick-actions-heading" className="text-base font-extrabold text-brand-900">Quick Actions</h2>
                  <p className="text-xs text-slate-500">Access important features.</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { label: 'View student records', icon: Search, page: 'student-search' as FacultyPage },
                  { label: 'Evaluate academic standing', icon: ClipboardCheck, page: 'evaluations' as FacultyPage },
                  { label: 'View academic records', icon: BookOpen, page: 'student-records' as FacultyPage },
                ].map((action) => (
                  <button key={action.label} type="button" onClick={() => onNavigate(action.page)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-xs font-bold text-brand-900 transition-colors hover:border-brand-300 hover:bg-brand-50">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><action.icon className="h-4 w-4" aria-hidden="true" /></span>
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
