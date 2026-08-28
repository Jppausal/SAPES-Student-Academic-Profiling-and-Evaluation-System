import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { EvaluationBadge, AcademicStatusBadge, Badge } from '../common/Badge';
import {
  FileCheck2,
  Printer,
  Download,
  Users,
  GraduationCap,
  Layers,
  HeartPulse,
  Church,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

export const AdminReportsView: React.FC = () => {
  const { students, academicRecords, evaluations } = useApp();

  const [activeReportTab, setActiveReportTab] = useState<
    'all' | 'special-classifications' | 'probation' | 'evaluations'
  >('all');

  const reportData = useMemo(() => {
    return students.map((s) => {
      const a =
        academicRecords.find((rec) => rec.studentNumber === s.studentNumber) || {
          studentNumber: s.studentNumber,
          program: s.program,
          curriculumYear: '2023',
          yearLevel: s.yearLevel,
          currentTerm: s.enrollmentTerm,
          academicStatus: 'Regular' as const,
          isUnderProbation: false,
          subjects: [],
          overallGWA: 0,
          majorSubjectGWA: 0,
          totalUnitsEarned: 0,
          totalDeficientUnits: 0,
          maxAllowedUnits: 23,
        };
      const e = evaluations.find((ev) => ev.studentNumber === s.studentNumber) || null;
      return { s, a, e };
    });
  }, [students, academicRecords, evaluations]);

  // Statistics
  const total = reportData.length;
  const ipCount = reportData.filter((r) => r.s.classifications.isIP).length;
  const pwdCount = reportData.filter((r) => r.s.classifications.isPWD).length;
  const shifterCount = reportData.filter((r) => r.s.classifications.isShifter).length;
  const transfereeCount = reportData.filter((r) => r.s.classifications.isTransferee).length;
  const probationCount = reportData.filter((r) => r.a.isUnderProbation).length;
  const eligibleCount = reportData.filter(
    (r) => r.e && r.e.evaluationStatus === 'Eligible'
  ).length;
  const forReviewCount = reportData.filter(
    (r) => r.e && r.e.evaluationStatus === 'For Review'
  ).length;
  const notEligibleCount = reportData.filter(
    (r) => r.e && r.e.evaluationStatus === 'Not Eligible'
  ).length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-indigo-600" />
            Consolidated University Profiling & Enrollment Analytics
          </h2>
          <p className="text-xs text-slate-500">
            Institutional master report for special classifications, academic retention, and faculty advisement statuses.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          Print / Export Report
        </button>
      </div>

      {/* Profiling Demographic Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 block">
            Indigenous Peoples (IP)
          </span>
          <span className="text-2xl font-black text-purple-700 font-mono mt-1 block">
            {ipCount}
          </span>
          <span className="text-[11px] text-slate-400">
            {total > 0 ? `${Math.round((ipCount / total) * 100)}%` : 0}% of student body
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-900 block">
            PWD / Accessibility
          </span>
          <span className="text-2xl font-black text-sky-700 font-mono mt-1 block">
            {pwdCount}
          </span>
          <span className="text-[11px] text-slate-400">
            Requires room accommodations
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block">
            Shifters & Transferees
          </span>
          <span className="text-2xl font-black text-amber-700 font-mono mt-1 block">
            {shifterCount + transfereeCount}
          </span>
          <span className="text-[11px] text-slate-400">
            {shifterCount} Shifters • {transfereeCount} Transferees
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-900 block">
            Academic Probation
          </span>
          <span className="text-2xl font-black text-rose-700 font-mono mt-1 block">
            {probationCount}
          </span>
          <span className="text-[11px] text-slate-400">
            Major GWA deficiency
          </span>
        </div>
      </div>

      {/* Report Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 shadow-xs text-xs">
        <button
          onClick={() => setActiveReportTab('all')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
            activeReportTab === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Enrolled ({total})
        </button>
        <button
          onClick={() => setActiveReportTab('special-classifications')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
            activeReportTab === 'special-classifications'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Special Classifications ({ipCount + pwdCount + shifterCount + transfereeCount})
        </button>
        <button
          onClick={() => setActiveReportTab('probation')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
            activeReportTab === 'probation'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Academic Probation ({probationCount})
        </button>
        <button
          onClick={() => setActiveReportTab('evaluations')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
            activeReportTab === 'evaluations'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Faculty Advisement Breakdown ({eligibleCount} Eligible, {forReviewCount} Review,{' '}
          {notEligibleCount} Hold)
        </button>
      </div>

      {/* Master Data Sheet */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-none">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Program & Year</th>
                <th className="py-3 px-4 text-center">Major GWA</th>
                <th className="py-3 px-4 text-center">Overall GWA</th>
                <th className="py-3 px-4">Special Profiling (IP / PWD)</th>
                <th className="py-3 px-4">Religion / Medical</th>
                <th className="py-3 px-4">Faculty Evaluation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.map(({ s, a, e }) => (
                <tr key={s.studentNumber} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">
                      {s.personalInfo.lastName}, {s.personalInfo.firstName}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500">
                      #{s.studentNumber}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">{s.program}</div>
                    <div className="mt-0.5">
                      <AcademicStatusBadge
                        status={a.academicStatus}
                        isProbation={a.isUnderProbation}
                        size="sm"
                      />
                    </div>
                  </td>

                  <td className="py-3 px-4 text-center font-mono font-black text-indigo-900 text-sm">
                    {a.majorSubjectGWA > 0 ? a.majorSubjectGWA.toFixed(2) : '0.00'}
                  </td>

                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                    {a.overallGWA > 0 ? a.overallGWA.toFixed(2) : '0.00'}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {s.classifications.isIP && (
                        <Badge variant="purple" size="sm">
                          IP: {s.classifications.ipGroupName}
                        </Badge>
                      )}
                      {s.classifications.isPWD && (
                        <Badge variant="info" size="sm">
                          PWD: {s.classifications.pwdType}
                        </Badge>
                      )}
                      {s.classifications.isShifter && (
                        <Badge variant="amber" size="sm">
                          Shifter
                        </Badge>
                      )}
                      {s.classifications.isTransferee && (
                        <Badge variant="success" size="sm">
                          Transferee
                        </Badge>
                      )}
                      {!s.classifications.isIP &&
                        !s.classifications.isPWD &&
                        !s.classifications.isShifter &&
                        !s.classifications.isTransferee && (
                          <span className="text-slate-400">Regular</span>
                        )}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-[11px] text-slate-600">
                    <span className="font-medium text-slate-800">
                      {s.religionProfiling.religion}
                    </span>
                    {s.religionProfiling.restrictedDays?.length ? (
                      <span className="block text-[10px] text-amber-800">
                        ⚠ Restricted: {s.religionProfiling.restrictedDays.join(', ')}
                      </span>
                    ) : null}
                  </td>

                  <td className="py-3 px-4">
                    {e ? (
                      <EvaluationBadge status={e.evaluationStatus} size="sm" />
                    ) : (
                      <EvaluationBadge status="Pending" size="sm" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
