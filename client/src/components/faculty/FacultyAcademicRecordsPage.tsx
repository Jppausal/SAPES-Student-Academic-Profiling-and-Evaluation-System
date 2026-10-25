import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CarFront, Check, ChevronDown, CircuitBoard, Clapperboard, Monitor, Search, Utensils } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BackendStudentSearch } from './BackendStudentSearch';
import { approveStudentEnrollment, fetchFacultyEvaluationRoster, fetchFacultyStudentWorkspace, FacultyRosterStudent, FacultyStudentWorkspace } from '../../lib/api';
import { TECHNOLOGY_PROGRAMS } from '../../lib/academicPrograms';
import { formatAcademicGwa, resolveAcademicGwas, resolvePeriodGwas } from '../../utils/mongoAcademicGwa';
import { formatStatusLabel } from '../../utils/formatStatusLabel';
import { StudentProfilePhoto } from '../common/StudentProfilePhoto';

const programDetails: Record<string, { icon: LucideIcon; description: string; color: string }> = {
  'Bachelor of Information Technology': {
    icon: Monitor,
    description: 'Software, networks, and digital systems.',
    color: 'bg-brand-100 text-brand-800',
  },
  'Entertainment and Multimedia Computing': {
    icon: Clapperboard,
    description: 'Interactive media, games, and digital content.',
    color: 'bg-accent-100 text-accent-700',
  },
  Electronics: {
    icon: CircuitBoard,
    description: 'Electronic systems, circuits, and instrumentation.',
    color: 'bg-brand-100 text-brand-800',
  },
  'Food Technology': {
    icon: Utensils,
    description: 'Food processing, quality, and product development.',
    color: 'bg-accent-100 text-accent-700',
  },
  'Automotive Technology': {
    icon: CarFront,
    description: 'Vehicle systems, diagnostics, and service.',
    color: 'bg-brand-100 text-brand-800',
  },
};

const yearOptions = [
  { value: '1', label: '1st year' },
  { value: '2', label: '2nd year' },
  { value: '3', label: '3rd year' },
  { value: '4', label: '4th year' },
];

const statusLabel = (student: FacultyRosterStudent) => student.isOnProbation
  ? 'Probationary'
  : student.currentStatus.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

interface FacultyAcademicRecordsPageProps {
  fixedProgram?: string;
  canApproveEnrollment?: boolean;
}

export const FacultyAcademicRecordsPage: React.FC<FacultyAcademicRecordsPageProps> = ({
  fixedProgram,
  canApproveEnrollment = false,
}) => {
  const [step, setStep] = useState<'courses' | 'roster' | 'student'>('courses');
  const [selectedProgram, setSelectedProgram] = useState(fixedProgram || '');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [roster, setRoster] = useState<FacultyRosterStudent[]>([]);
  const [studentWorkspace, setStudentWorkspace] = useState<FacultyStudentWorkspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [approvingEnrollment, setApprovingEnrollment] = useState(false);
  const [enrollmentMessage, setEnrollmentMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedProgram) {
      setRoster([]);
      return;
    }

    let active = true;
    setLoading(true);
    setError('');
    setSelectedYear('');
    setSelectedSection('');

    fetchFacultyEvaluationRoster(selectedProgram)
      .then((students) => { if (active) setRoster(students); })
      .catch((requestError) => {
        if (!active) return;
        setRoster([]);
        setError(requestError instanceof Error ? requestError.message : 'Unable to load this course roster.');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [selectedProgram]);

  const availableSections = useMemo(() => [...new Set(
    roster
      .filter((student) => String(student.yearLevel || '') === selectedYear)
      .map((student) => student.section)
      .filter((section) => section && section !== 'Unassigned')
  )].sort(), [roster, selectedYear]);

  const visibleStudents = roster.filter((student) => (
    String(student.yearLevel || '') === selectedYear &&
    student.section === selectedSection
  ));

  const confirmedStudents = roster.filter((student) => (
    student.yearLevel === Number(selectedYear) && student.section === selectedSection
  ));

  const toggleProgram = (program: string) => {
    if (fixedProgram) return;
    setSelectedProgram((current) => current === program ? '' : program);
    setSelectedYear('');
    setSelectedSection('');
    setStudentWorkspace(null);
    setStep('courses');
  };

  const confirmClass = () => {
    if (!selectedProgram || !selectedYear || !selectedSection) return;
    setStudentWorkspace(null);
    setStep('roster');
  };

  const openStudent = async (student: FacultyRosterStudent) => {
    setLoadingStudent(true);
    setError('');
    setEnrollmentMessage('');
    try {
      setStudentWorkspace(await fetchFacultyStudentWorkspace(student.institutionId));
      setStep('student');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load this student record.');
    } finally {
      setLoadingStudent(false);
    }
  };

  const selectedCourseLabel = TECHNOLOGY_PROGRAMS.find((program) => program.value === selectedProgram)?.label || selectedProgram;
  const studentName = studentWorkspace
    ? `${studentWorkspace.student.personalInformation.firstName || ''} ${studentWorkspace.student.personalInformation.lastName || ''}`.trim()
    : '';
  const latestRecord = studentWorkspace?.academicRecords[0];
  const latestFallbackGwas = resolvePeriodGwas(latestRecord);
  const reportedLatestPeriod = studentWorkspace?.latestAcademicPeriod;
  const latestAcademicPeriod = reportedLatestPeriod || latestRecord ? {
    academicYear: reportedLatestPeriod?.academicYear || latestRecord?.academicYear || '',
    semester: reportedLatestPeriod?.semester || latestRecord?.semester || '',
    overallGwa: reportedLatestPeriod?.overallGwa ?? latestFallbackGwas.overallGwa ?? undefined,
    majorSubjectGwa: reportedLatestPeriod?.majorSubjectGwa ?? latestFallbackGwas.majorSubjectGwa ?? 0,
  } : null;
  const historicalFallbackGwas = resolveAcademicGwas(studentWorkspace?.academicRecords || []);
  const historicalOverallGwa = studentWorkspace?.overallGwa ?? historicalFallbackGwas.overallGwa;

  const classFilters = (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700">Year level
          <select value={selectedYear} onChange={(event) => { setSelectedYear(event.target.value); setSelectedSection(''); }} className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800">
            <option value="">Choose year level</option>
            {yearOptions.map((year) => <option key={year.value} value={year.value}>{year.label}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">Section
          <select value={selectedSection} onChange={(event) => setSelectedSection(event.target.value)} disabled={!selectedYear} className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 disabled:bg-slate-100 disabled:text-slate-400">
            <option value="">{selectedYear ? 'Choose section' : 'Select a year first'}</option>
            {availableSections.map((section) => <option key={section} value={section}>{section}</option>)}
          </select>
        </label>
      </div>
      <button type="button" onClick={confirmClass} disabled={!selectedYear || !selectedSection || loading} className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
        <Check className="h-4 w-4" /> View students
      </button>
      {error && <p role="alert" className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      {loading && <p className="mt-3 text-xs text-slate-500">Loading course students…</p>}
    </>
  );

  const proceedToEnrollment = async () => {
    if (!studentWorkspace || studentWorkspace.student.enrollmentStatus === 'enrolled') return;
    setApprovingEnrollment(true);
    setError('');
    setEnrollmentMessage('');
    try {
      const enrollmentStatus = await approveStudentEnrollment(studentWorkspace.student.institutionId);
      setStudentWorkspace((current) => current ? {
        ...current,
        student: { ...current.student, enrollmentStatus },
      } : current);
      setRoster((current) => current.map((student) => (
        student.institutionId === studentWorkspace.student.institutionId
          ? { ...student, enrollmentStatus }
          : student
      )));
      setEnrollmentMessage('Enrollment approved. The student status is now enrolled.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to approve this student for enrollment.');
    } finally {
      setApprovingEnrollment(false);
    }
  };

  return (
    <div className="space-y-6">
      <BackendStudentSearch key={`quick-search-${step}`} displayMode="records" />
      {step === 'courses' && <section aria-labelledby="records-programs-heading" className="space-y-3">
        <div>
          {fixedProgram ? (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Course</p>
              <h2 id="records-programs-heading" className="mt-1 text-base font-bold text-slate-900">Filter by year level and section</h2>
              <p className="mt-1 text-sm text-slate-600">{selectedCourseLabel}</p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">College of Technologies</p>
              <h2 id="records-programs-heading" className="mt-1 text-base font-bold text-slate-900">Select a course</h2>
            </>
          )}
        </div>

        {fixedProgram ? (
          <div className="max-w-2xl rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
            {classFilters}
          </div>
        ) : (
          <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {TECHNOLOGY_PROGRAMS.map((program) => {
              const details = programDetails[program.value];
              const Icon = details.icon;
              const isSelected = selectedProgram === program.value;
              return (
                <article key={program.value} className={`overflow-hidden rounded-lg border bg-white transition ${isSelected ? 'border-brand-600 ring-1 ring-brand-600 shadow-sm sm:col-span-2 xl:col-span-1' : 'border-slate-200'}`}>
                  <button
                    type="button"
                    aria-expanded={isSelected}
                    onClick={() => toggleProgram(program.value)}
                    className="flex min-h-28 w-full items-start justify-between gap-3 p-4 text-left hover:bg-slate-50"
                  >
                    <span className="flex min-w-0 gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${details.color}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold leading-snug text-slate-900">{program.label}</span>
                        <span className="mt-1.5 block text-xs leading-relaxed text-slate-600">{details.description}</span>
                      </span>
                    </span>
                    <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-slate-500 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                  </button>

                  {isSelected && (
                    <div className="border-t border-slate-200 bg-slate-50/70 p-4">
                      {classFilters}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>}

      {step === 'roster' && (
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-600">Confirmed class</p>
              <h2 className="mt-1 text-lg font-extrabold text-slate-900">{selectedCourseLabel}</h2>
              <p className="mt-1 text-xs text-slate-600">{yearOptions.find((year) => year.value === selectedYear)?.label} · Section {selectedSection}</p>
            </div>
            <button type="button" onClick={() => setStep('courses')} className="inline-flex items-center gap-2 self-start rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:self-auto"><ArrowLeft className="h-4 w-4" /> Change class</button>
          </div>
          {confirmedStudents.length ? <ul className="divide-y divide-slate-100">
            {confirmedStudents.map((student) => (
              <li key={student.institutionId}>
                <button type="button" onClick={() => void openStudent(student)} className="flex w-full flex-col justify-between gap-2 rounded-md px-3 py-3 text-left transition hover:bg-brand-50 sm:flex-row sm:items-center">
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{student.firstName} {student.lastName}</span>
                    <span className="mt-1 block font-mono text-xs text-slate-500">{student.institutionId} · @{student.username}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${student.isOnProbation ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>{statusLabel(student)}</span>
                    <ChevronDown className="h-4 w-4 -rotate-90 text-slate-400" />
                  </span>
                </button>
              </li>
            ))}
          </ul> : <p className="rounded-md bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">No students are assigned to this class.</p>}
        </section>
      )}

      {step === 'student' && studentWorkspace && (
        <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start">
            <StudentProfilePhoto
              institutionId={studentWorkspace.student.institutionId}
              studentName={studentName || studentWorkspace.student.institutionId}
              className="h-24 w-24 shrink-0 rounded-lg border border-slate-200 object-cover sm:h-28 sm:w-28"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-600">Report card grades</p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-900">{studentName || studentWorkspace.student.institutionId}</h2>
              <p className="mt-1 font-mono text-xs text-slate-500">Student ID: {studentWorkspace.student.institutionId}</p>
              <p className="mt-2 text-xs text-slate-600">{selectedCourseLabel} · {yearOptions.find((year) => year.value === selectedYear)?.label} · Section {selectedSection}</p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end lg:ml-auto">
              <button type="button" onClick={() => setStep('roster')} className="inline-flex shrink-0 items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /> Class list</button>
              <div className="min-w-64 rounded-lg bg-brand-700 px-4 py-2.5 text-white"><p className="text-[10px] uppercase tracking-wide text-brand-200">Latest-period GWA</p><div className="mt-1 grid grid-cols-2 gap-4"><div><span className="text-[10px] text-brand-200">Overall</span><p className="text-2xl font-black">{formatAcademicGwa(latestAcademicPeriod?.overallGwa)}</p></div><div><span className="text-[10px] text-brand-200">Major</span><p className="text-2xl font-black">{formatAcademicGwa(latestAcademicPeriod?.majorSubjectGwa)}</p></div></div>{latestAcademicPeriod && <p className="mt-1 text-[10px] text-brand-100">{latestAcademicPeriod.academicYear} · {latestAcademicPeriod.semester}</p>}<p className="mt-1 text-[10px] text-brand-200">Historical cumulative: Overall {formatAcademicGwa(historicalOverallGwa)} · Major {formatAcademicGwa(studentWorkspace.majorSubjectGwa)}</p></div>
            </div>
          </div>

          {studentWorkspace.academicRecords.length ? studentWorkspace.academicRecords.map((term) => (
            <section key={`${term.academicYear}-${term.semester}`} className="overflow-hidden rounded-md border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2.5"><h3 className="text-xs font-bold text-slate-800">{term.academicYear} · {term.semester}</h3><span className="text-[10px] font-semibold text-slate-500">Overall {formatAcademicGwa(resolvePeriodGwas(term).overallGwa)} · Major {formatAcademicGwa(resolvePeriodGwas(term).majorSubjectGwa)}</span></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs">
                <thead className="border-y border-slate-200 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Units</th><th className="px-3 py-2">Grade</th><th className="px-3 py-2">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{term.subjects.map((subject) => <tr key={subject.subjectCode}>
                  <td className="px-3 py-2"><span className="font-mono font-semibold">{subject.subjectCode}</span><span className="ml-2 text-slate-700">{subject.subjectName}</span></td>
                  <td className="px-3 py-2">{subject.isMajor ? 'Major' : 'Non-major'}</td>
                  <td className="px-3 py-2">{subject.units}</td>
                  <td className="px-3 py-2 font-semibold">{subject.grade.toFixed(2)}</td>
                  <td className="px-3 py-2">{formatStatusLabel(subject.status)}</td>
                </tr>)}</tbody>
              </table></div>
            </section>
          )) : <p className="rounded-md bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">No academic subjects are recorded for this student.</p>}

          {canApproveEnrollment && <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            {enrollmentMessage && <p role="status" className="text-sm font-medium text-emerald-700">{enrollmentMessage}</p>}
            <button
              type="button"
              onClick={() => void proceedToEnrollment()}
              disabled={approvingEnrollment || studentWorkspace.student.enrollmentStatus === 'enrolled'}
              className="inline-flex items-center justify-center gap-2 self-start rounded-md bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-700"
            >
              <Check className="h-4 w-4" />
              {approvingEnrollment ? 'Approving enrollment…' : studentWorkspace.student.enrollmentStatus === 'enrolled' ? 'Enrollment approved' : 'Proceed to enrollment'}
            </button>
          </div>}
        </section>
      )}

      {loadingStudent && <div role="status" className="rounded-lg border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">Loading student profile and subjects…</div>}
      {error && step !== 'courses' && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
    </div>
  );
};
