import React from 'react';
import { BookOpen, GraduationCap, UserRound } from 'lucide-react';
import { StudentIdentity, StudentReport } from '../../lib/api';

interface BackendStudentWorkspaceProps {
  identity: StudentIdentity;
  report: StudentReport;
}

export const BackendStudentWorkspace: React.FC<BackendStudentWorkspaceProps> = ({
  identity,
  report,
}) => {
  const name = [
    identity.personalInformation?.firstName,
    identity.personalInformation?.middleName,
    identity.personalInformation?.lastName,
  ].filter(Boolean).join(' ');

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Authenticated student workspace</p>
        <h1 className="mt-2 text-2xl font-extrabold">{name || 'Student dashboard'}</h1>
        <p className="mt-1 font-mono text-xs text-slate-300">{identity.institutionId}</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><UserRound className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-xs text-slate-500">Student type</p><strong className="block text-slate-900">{identity.classification?.studentType || 'Not recorded'}</strong></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><GraduationCap className="h-5 w-5 text-indigo-600" /><p className="mt-3 text-xs text-slate-500">Major-subject GWA</p><strong className="block text-2xl text-slate-900">{report.majorSubjectGwa.toFixed(2)}</strong></div>
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
          <div><dt className="text-xs text-slate-500">Birth date</dt><dd className="mt-1 font-semibold text-slate-900">{identity.personalInformation?.birthDate || 'Not recorded'}</dd></div>
          <div><dt className="text-xs text-slate-500">Sex</dt><dd className="mt-1 font-semibold text-slate-900">{identity.personalInformation?.sex || 'Not recorded'}</dd></div>
          <div><dt className="text-xs text-slate-500">Civil status</dt><dd className="mt-1 font-semibold text-slate-900">{identity.personalInformation?.civilStatus || 'Not recorded'}</dd></div>
          <div><dt className="text-xs text-slate-500">Citizenship</dt><dd className="mt-1 font-semibold text-slate-900">{identity.personalInformation?.citizenship || 'Not recorded'}</dd></div>
          <div><dt className="text-xs text-slate-500">Religion</dt><dd className="mt-1 font-semibold text-slate-900">{identity.religiousInformation?.religion || 'Not recorded'}</dd></div>
          <div><dt className="text-xs text-slate-500">Student classification</dt><dd className="mt-1 font-semibold text-slate-900">{identity.classification?.studentType || 'Not recorded'}</dd></div>
        </dl>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-bold text-slate-900">Academic records</h2>
          <p className="mt-1 text-xs text-slate-500">Records loaded from the authenticated student’s institution ID.</p>
        </div>
        {report.academicRecords.map((record) => (
          <div key={`${record.academicYear}-${record.semester}`} className="border-b border-slate-100 p-5 last:border-0">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">{record.academicYear} · {record.semester}</h3>
              <span className="text-xs text-slate-500">{record.subjects.length} subjects</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="border-b border-slate-100 text-slate-500"><tr><th className="py-2">Code</th><th>Name</th><th>Units</th><th>Grade</th><th>Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{record.subjects.map((subject) => <tr key={subject.subjectCode}><td className="py-2 font-mono">{subject.subjectCode}</td><td>{subject.subjectName}</td><td>{subject.units}</td><td>{subject.grade}</td><td>{subject.status}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};
