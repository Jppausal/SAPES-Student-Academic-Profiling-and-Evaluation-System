import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, GraduationCap, UserRound } from 'lucide-react';
import { AcademicSubject, StudentIdentity, StudentReport } from '../../lib/api';

interface BackendStudentWorkspaceProps {
  identity: StudentIdentity;
  report: StudentReport;
}

const formatDateOnly = (value?: string) => {
  if (!value) return 'Not recorded';
  const datePart = value.slice(0, 10);
  const date = new Date(`${datePart}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? 'Not recorded'
    : date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
};

const isValidAcademicSubject = (subject: unknown): subject is AcademicSubject => {
  if (!subject || typeof subject !== 'object') return false;
  const candidate = subject as Partial<AcademicSubject>;
  return typeof candidate.subjectCode === 'string' &&
    typeof candidate.subjectName === 'string' &&
    Number.isFinite(candidate.units) &&
    Number.isFinite(candidate.grade) &&
    typeof candidate.isMajor === 'boolean' &&
    typeof candidate.status === 'string';
};

export const BackendStudentWorkspace: React.FC<BackendStudentWorkspaceProps> = ({
  identity,
  report,
}) => {
  const name = [
    identity.personalInformation?.firstName,
    identity.personalInformation?.middleName,
    identity.personalInformation?.lastName,
  ].filter(Boolean).join(' ');

  const validRecords = useMemo(() => report.academicRecords.filter((record) =>
    typeof record.academicYear === 'string' &&
    Boolean(record.academicYear.trim()) &&
    typeof record.semester === 'string' &&
    Boolean(record.semester.trim()) &&
    Array.isArray(record.subjects)
  ), [report.academicRecords]);
  const academicYears = useMemo(() => [...new Set(
    validRecords.map((record) => record.academicYear)
  )], [validRecords]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(academicYears[0] || '');
  const semesters = useMemo(() => validRecords
    .filter((record) => record.academicYear === selectedAcademicYear)
    .map((record) => record.semester), [selectedAcademicYear, validRecords]);
  const [selectedSemester, setSelectedSemester] = useState(semesters[0] || '');

  useEffect(() => {
    if (!academicYears.includes(selectedAcademicYear)) {
      setSelectedAcademicYear(academicYears[0] || '');
    }
  }, [academicYears, selectedAcademicYear]);

  useEffect(() => {
    if (!semesters.includes(selectedSemester)) {
      setSelectedSemester(semesters[0] || '');
    }
  }, [selectedSemester, semesters]);

  const selectedRecord = validRecords.find((record) =>
    record.academicYear === selectedAcademicYear && record.semester === selectedSemester
  );
  const selectedSubjects = selectedRecord?.subjects.filter(isValidAcademicSubject) || [];
  const invalidSubjectCount = (selectedRecord?.subjects.length || 0) - selectedSubjects.length;
  const selectedPeriodGwa = selectedRecord?.majorSubjectGwa ?? 0;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Authenticated student workspace</p>
        <h1 className="mt-2 text-2xl font-extrabold">{name || 'Student dashboard'}</h1>
        <p className="mt-1 font-mono text-xs text-slate-300">{identity.institutionId}</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><UserRound className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-xs text-slate-500">Student type</p><strong className="block text-slate-900">{[identity.classification?.studentType || 'Not recorded', identity.classification?.isShifter ? 'Shifter' : '', identity.classification?.isTransferee ? 'Transferee' : '', identity.classification?.isIP ? 'IP' : '', identity.classification?.isPWD ? 'PWD' : ''].filter(Boolean).join(' • ')}</strong></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><GraduationCap className="h-5 w-5 text-indigo-600" /><p className="mt-3 text-xs text-slate-500">Selected-period major GWA</p><strong className="block text-2xl text-slate-900">{selectedRecord ? selectedPeriodGwa.toFixed(2) : '—'}</strong></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><BookOpen className="h-5 w-5 text-amber-600" /><p className="mt-3 text-xs text-slate-500">Academic status</p><strong className="block text-slate-900">{identity.academicStatus?.currentStatus || 'Not recorded'}</strong></div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 border-b border-slate-100 pb-3">
          <h2 className="font-bold text-slate-900">Personal profile</h2>
          <p className="mt-1 text-xs text-slate-500">Personal information recorded for your authenticated student account.</p>
        </div>
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="text-xs text-slate-500">First name</dt><dd className="mt-1 font-semibold text-slate-900">{identity.personalInformation?.firstName || 'Not recorded'}</dd></div>
          <div><dt className="text-xs text-slate-500">Middle name</dt><dd className="mt-1 font-semibold text-slate-900">{identity.personalInformation?.middleName || 'Not recorded'}</dd></div>
          <div><dt className="text-xs text-slate-500">Last name</dt><dd className="mt-1 font-semibold text-slate-900">{identity.personalInformation?.lastName || 'Not recorded'}</dd></div>
          <div><dt className="text-xs text-slate-500">Birth date</dt><dd className="mt-1 font-semibold text-slate-900">{formatDateOnly(identity.personalInformation?.birthDate)}</dd></div>
          <div><dt className="text-xs text-slate-500">Sex</dt><dd className="mt-1 font-semibold text-slate-900">{identity.personalInformation?.sex || 'Not recorded'}</dd></div>
          <div><dt className="text-xs text-slate-500">Civil status</dt><dd className="mt-1 font-semibold text-slate-900">{identity.personalInformation?.civilStatus || 'Not recorded'}</dd></div>
          <div><dt className="text-xs text-slate-500">Citizenship</dt><dd className="mt-1 font-semibold text-slate-900">{identity.personalInformation?.citizenship || 'Not recorded'}</dd></div>
          <div><dt className="text-xs text-slate-500">Religion</dt><dd className="mt-1 font-semibold text-slate-900">{identity.religiousInformation?.religion || 'Not recorded'}</dd></div>
          <div><dt className="text-xs text-slate-500">Student classification</dt><dd className="mt-1 font-semibold text-slate-900">{[identity.classification?.studentType || 'Not recorded', identity.classification?.isShifter ? 'Shifter' : '', identity.classification?.isTransferee ? 'Transferee' : '', identity.classification?.isIP ? 'IP' : '', identity.classification?.isPWD ? 'PWD' : ''].filter(Boolean).join(' • ')}</dd></div>
        </dl>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-bold text-slate-900">Grades / Academic Records</h2>
          <p className="mt-1 text-xs text-slate-500">Choose an available period to view only that semester’s MongoDB-backed grades.</p>
        </div>
        {validRecords.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No academic records are available for your account.</div>
        ) : (
          <div className="p-5">
            <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">Academic Year
                <select value={selectedAcademicYear} onChange={(event) => {
                  const nextYear = event.target.value;
                  setSelectedAcademicYear(nextYear);
                  setSelectedSemester(validRecords.find((record) => record.academicYear === nextYear)?.semester || '');
                }} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
                  {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">Semester
                <select value={selectedSemester} onChange={(event) => setSelectedSemester(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
                  {semesters.map((semester) => <option key={semester} value={semester}>{semester}</option>)}
                </select>
              </label>
            </div>
            {selectedRecord ? (
              <div className="mt-5">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div><h3 className="text-sm font-bold text-slate-900">{selectedRecord.academicYear} · {selectedRecord.semester}</h3><p className="text-xs text-slate-500">Academic status: {identity.academicStatus?.currentStatus || 'Not recorded'}</p></div>
                  <span className="text-xs font-semibold text-indigo-700">Major Subject GWA: {selectedPeriodGwa.toFixed(2)}</span>
                </div>
                {invalidSubjectCount > 0 && <p role="alert" className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{invalidSubjectCount} malformed subject {invalidSubjectCount === 1 ? 'entry was' : 'entries were'} omitted.</p>}
                {selectedSubjects.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">No subjects are recorded for this period.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-left text-xs">
                      <thead className="border-b border-slate-100 text-slate-500"><tr><th className="py-2">Code</th><th>Subject</th><th>Units</th><th>Type</th><th>Grade</th><th>Status</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">{selectedSubjects.map((subject) => <tr key={subject.subjectCode}><td className="py-2 font-mono">{subject.subjectCode}</td><td>{subject.subjectName}</td><td>{subject.units}</td><td>{subject.isMajor ? 'Major' : 'Non-Major'}</td><td className="font-semibold text-slate-900">{subject.grade.toFixed(2)}</td><td>{subject.status}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">No record exists for the selected academic period.</div>}
          </div>
        )}
      </section>
    </div>
  );
};
