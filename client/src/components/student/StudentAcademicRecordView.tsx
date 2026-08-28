import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  GraduationCap,
  Award,
  AlertTriangle,
  FileText,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { AcademicStatusBadge, EvaluationBadge } from '../common/Badge';
import { getGradeQualityDescription } from '../../utils/academicCalculators';

export const StudentAcademicRecordView: React.FC = () => {
  const { currentStudentProfile, currentAcademicRecord, currentEvaluation } = useApp();

  if (!currentStudentProfile || !currentAcademicRecord) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-slate-500">No academic record loaded.</p>
      </div>
    );
  }

  const p = currentStudentProfile;
  const a = currentAcademicRecord;
  const e = currentEvaluation;
  const gradeDesc = getGradeQualityDescription(a.majorSubjectGWA);

  const majorSubjects = a.subjects.filter((s) => s.isMajor);
  const generalSubjects = a.subjects.filter((s) => !s.isMajor);

  return (
    <div className="space-y-6">
      {/* Top Academic Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200/60">
                Official Transcript of Academic Record
              </span>
              <AcademicStatusBadge
                status={a.academicStatus}
                isProbation={a.isUnderProbation}
              />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">
              {p.program}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Curriculum: {a.curriculumYear} • Term: {a.currentTerm} • Student #{a.studentNumber}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Major GWA Metric Pill */}
            <div className="px-4 py-3 rounded-2xl bg-indigo-900 text-white shadow-md">
              <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">
                Major-Subject GWA
              </div>
              <div className="text-2xl font-black font-mono mt-0.5">
                {a.majorSubjectGWA > 0 ? a.majorSubjectGWA.toFixed(2) : '0.00'}
              </div>
              <div className="text-[10px] text-indigo-200 font-medium mt-0.5">
                Auto-computed Major Rating
              </div>
            </div>

            {/* Overall GWA Metric Pill */}
            <div className="px-4 py-3 rounded-2xl bg-slate-100 border border-slate-200">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                Overall GWA
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 mt-0.5">
                {a.overallGWA > 0 ? a.overallGWA.toFixed(2) : '0.00'}
              </div>
              <div className="text-[10px] text-slate-600 font-semibold mt-0.5">
                {gradeDesc.label}
              </div>
            </div>
          </div>
        </div>

        {/* Units Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-medium">Total Units Earned</span>
            <span className="font-extrabold text-slate-900 text-sm font-mono">
              {a.totalUnitsEarned} Units
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-medium">Deficient Units</span>
            <span
              className={`font-extrabold text-sm font-mono ${
                a.totalDeficientUnits > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {a.totalDeficientUnits} Units
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-medium">Max Allowed Load</span>
            <span className="font-extrabold text-indigo-700 text-sm font-mono">
              {a.maxAllowedUnits} Units
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-medium">Assigned Adviser</span>
            <span className="font-bold text-slate-900 truncate block">
              {a.adviserAssigned || 'College Advisement Pool'}
            </span>
          </div>
        </div>
      </div>

      {/* Probation Banner if Active */}
      {a.isUnderProbation && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-rose-900">
                Academic Probation Notice (Term {a.probationTermCount || 1})
              </h3>
              <p className="text-xs text-rose-700 mt-1">
                {a.probationReason ||
                  'Your Major-Subject GWA has fallen below the department retention standard. You are restricted to retaking prerequisite courses with a reduced maximum load of 15 units.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Major Subjects Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              Major Subject Academic Record
            </h2>
            <p className="text-xs text-slate-500">
              Only courses flagged as Major Subjects are factored into your Major-Subject GWA.
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
            {majorSubjects.length} Major Courses
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-100">
              <tr>
                <th className="py-2.5 px-3">Course Code</th>
                <th className="py-2.5 px-3">Descriptive Title</th>
                <th className="py-2.5 px-3 text-center">Units</th>
                <th className="py-2.5 px-3 text-center">Final Grade</th>
                <th className="py-2.5 px-3 text-center">Remark</th>
                <th className="py-2.5 px-3">Term Taken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {majorSubjects.map((s) => {
                const isPassed = s.remarks === 'Passed';
                const isFailed = s.remarks === 'Failed';
                return (
                  <tr key={s.code} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {s.code}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {s.title}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">{s.units}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-sm">
                      <span
                        className={
                          isFailed
                            ? 'text-rose-600'
                            : s.grade <= 1.5
                            ? 'text-emerald-700'
                            : 'text-slate-900'
                        }
                      >
                        {s.grade.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                          isPassed
                            ? 'bg-emerald-50 text-emerald-700'
                            : isFailed
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {isPassed && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {isFailed && <XCircle className="w-3 h-3 text-rose-600" />}
                        {s.remarks}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{s.term}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* General Education / Non-Major Subjects Table */}
      {generalSubjects.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-600" />
                General Education & Institutional Electives
              </h2>
              <p className="text-xs text-slate-500">
                Included in Overall GWA calculation.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              {generalSubjects.length} Courses
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Course Code</th>
                  <th className="py-2.5 px-3">Descriptive Title</th>
                  <th className="py-2.5 px-3 text-center">Units</th>
                  <th className="py-2.5 px-3 text-center">Final Grade</th>
                  <th className="py-2.5 px-3 text-center">Remark</th>
                  <th className="py-2.5 px-3">Term Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {generalSubjects.map((s) => (
                  <tr key={s.code} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {s.code}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">{s.title}</td>
                    <td className="py-3 px-3 text-center font-mono">{s.units}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-sm text-slate-900">
                      {s.grade.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {s.remarks}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{s.term}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
