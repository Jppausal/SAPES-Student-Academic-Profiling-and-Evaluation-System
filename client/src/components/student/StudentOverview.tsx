import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  User,
  GraduationCap,
  HeartPulse,
  Church,
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  BookOpen,
  Calendar,
  CheckCircle2,
  Layers,
  MapPin,
  Clock,
  Printer,
} from 'lucide-react';
import { EvaluationBadge, AcademicStatusBadge, Badge } from '../common/Badge';
import { ProfileProgressBar } from '../common/ProfileProgressBar';
import { getGradeQualityDescription } from '../../utils/academicCalculators';

export const StudentOverview: React.FC<{
  onNavigateToTab: (tab: 'profile' | 'academics' | 'summary') => void;
}> = ({ onNavigateToTab }) => {
  const { currentStudentProfile, currentAcademicRecord, currentEvaluation } = useApp();

  if (!currentStudentProfile || !currentAcademicRecord) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-slate-500">No active student profile loaded.</p>
      </div>
    );
  }

  const p = currentStudentProfile;
  const a = currentAcademicRecord;
  const e = currentEvaluation;
  const gradeDesc = getGradeQualityDescription(a.majorSubjectGWA);

  return (
    <div className="space-y-6">
      {/* Top Banner with Student Identity & Enrollment Status */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Background Subtle Accent */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-2xl font-black shadow-lg ring-4 ring-white/10">
              {p.personalInfo.firstName[0]}
              {p.personalInfo.lastName[0]}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                  Student Portal
                </span>
                <span className="text-xs font-mono text-slate-300">
                  ID: #{p.studentNumber}
                </span>
                <AcademicStatusBadge
                  status={a.academicStatus}
                  isProbation={a.isUnderProbation}
                />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {p.personalInfo.firstName} {p.personalInfo.lastName}
              </h1>
              <p className="text-sm text-slate-300 flex flex-wrap items-center gap-2 mt-1">
                <span>{p.program}</span>
                <span>•</span>
                <span>Year {p.yearLevel}</span>
                {p.section && <span>• Section {p.section}</span>}
              </p>
            </div>
          </div>

          {/* Action & Evaluation Quick Pill */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="text-left lg:text-right">
              <span className="text-[11px] text-slate-400 font-medium block">
                Adviser Evaluation Result
              </span>
              <div className="mt-1">
                {e ? (
                  <EvaluationBadge status={e.evaluationStatus} size="lg" />
                ) : (
                  <EvaluationBadge status="Pending" size="lg" />
                )}
              </div>
            </div>

            <button
              onClick={() => onNavigateToTab('profile')}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20"
            >
              Update Student Profile
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Profile Completion Indicator */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <ProfileProgressBar percentage={p.profileCompletionPercentage} />
        </div>
      </div>

      {/* Probation Warning Banner (If Applicable) */}
      {a.isUnderProbation && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-rose-900">
              Notice of Academic Probation Standing
            </h3>
            <p className="text-xs text-rose-700 mt-1 leading-relaxed">
              {a.probationReason ||
                'Your Major-Subject GWA or prerequisite subjects require faculty evaluation. Your enrollment load is currently restricted.'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-rose-800 bg-rose-100/80 px-2.5 py-1 rounded-md border border-rose-200">
                Max Allowed Units: {a.maxAllowedUnits} Units
              </span>
              {e?.remarks && (
                <span className="text-xs text-rose-900 italic">
                  Adviser note: "{e.remarks}"
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profiling Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Academic Metrics (Auto-Computed Major GWA) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Academic GWA
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {a.majorSubjectGWA > 0 ? a.majorSubjectGWA.toFixed(2) : 'N/A'}
            </span>
            <span className="text-xs text-slate-500 font-medium">Major GWA</span>
          </div>
          <p className="text-xs mt-2 text-slate-600">
            Overall: <span className="font-semibold">{a.overallGWA.toFixed(2)}</span> ({gradeDesc.label})
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Total Units Earned:</span>
            <span className="font-bold text-slate-800">{a.totalUnitsEarned} units</span>
          </div>
        </div>

        {/* Card 2: Special Classifications */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Classifications
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1.5 min-h-[48px]">
            {p.classifications.isIP && (
              <Badge variant="purple" size="sm">
                IP: {p.classifications.ipGroupName || 'Indigenous Member'}
              </Badge>
            )}
            {p.classifications.isPWD && (
              <Badge variant="info" size="sm">
                PWD: {p.classifications.pwdType || 'Special Needs'}
              </Badge>
            )}
            {p.classifications.isShifter && (
              <Badge variant="amber" size="sm">
                Shifter Student
              </Badge>
            )}
            {p.classifications.isTransferee && (
              <Badge variant="default" size="sm">
                Transferee ({p.classifications.creditedUnits || 0} units)
              </Badge>
            )}
            {p.classifications.isWorkingStudent && (
              <Badge variant="success" size="sm">
                Working Student
              </Badge>
            )}
            {!p.classifications.isIP &&
              !p.classifications.isPWD &&
              !p.classifications.isShifter &&
              !p.classifications.isTransferee &&
              !p.classifications.isWorkingStudent && (
                <span className="text-xs text-slate-500 italic">
                  Standard Student Profile
                </span>
              )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Evaluation Access:</span>
            <span className="font-semibold text-emerald-700">Verified</span>
          </div>
        </div>

        {/* Card 3: Religion & Scheduling */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Religion & Schedule
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Church className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-900">
            {p.religionProfiling.religion || 'Not specified'}
          </p>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            {p.religionProfiling.hasSchedulingObservance
              ? `Observance: ${p.religionProfiling.observanceDetails || 'Special schedule requirements reported'}`
              : 'No special Sabbath or scheduling restrictions reported.'}
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Restricted Days:</span>
            <span className="font-semibold text-slate-800">
              {p.religionProfiling.restrictedDays?.join(', ') || 'None'}
            </span>
          </div>
        </div>

        {/* Card 4: Health & Medical Info */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Health & Medical
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <HeartPulse className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-slate-700">Blood Type:</span>
            <span className="text-sm font-bold font-mono text-rose-700">
              {p.healthMedicalProfiling.bloodType}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            {p.healthMedicalProfiling.hasMedicalCondition
              ? p.healthMedicalProfiling.chronicConditions || p.healthMedicalProfiling.allergies || 'Medical notes recorded'
              : 'No chronic physical restrictions on record.'}
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Faculty Consent:</span>
            <span
              className={`font-semibold ${
                p.healthMedicalProfiling.authorizedForFacultyEvaluation
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}
            >
              {p.healthMedicalProfiling.authorizedForFacultyEvaluation
                ? 'Authorized'
                : 'Withheld'}
            </span>
          </div>
        </div>
      </div>

      {/* Evaluation Remarks & Advisement Summary Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-indigo-600" />
              Faculty Evaluation & Enrollment Advisement
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Official review outcome for enrollment in {p.enrollmentTerm}
            </p>
          </div>
          {e && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              Evaluated on {new Date(e.evaluatedAt).toLocaleDateString()} by{' '}
              <span className="font-semibold text-slate-800">{e.facultyName}</span>
            </div>
          )}
        </div>

        {e ? (
          <div className="mt-5 space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-700 block mb-1">
                Adviser Remarks & Instructions:
              </span>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {e.remarks}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs">
                <span className="text-slate-400 font-semibold block mb-1">
                  Recommended Section Placement
                </span>
                <span className="font-bold text-slate-900">
                  {e.recommendedSection || 'Department standard block'}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs">
                <span className="text-slate-400 font-semibold block mb-1">
                  Approved Maximum Unit Load
                </span>
                <span className="font-bold text-indigo-700 text-sm font-mono">
                  {e.recommendedMaxUnits || a.maxAllowedUnits} Units
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs">
                <span className="text-slate-400 font-semibold block mb-1">
                  Special Placement Accommodations
                </span>
                <span className="font-semibold text-slate-800">
                  {e.sectionPlacementConsiderations.healthMobilityConsiderations
                    ? 'Ground Floor / Elevator Access Flagged'
                    : e.sectionPlacementConsiderations.religiousConsiderations
                    ? 'Weekday Class Constraint Flagged'
                    : 'Standard Classroom Placement'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 p-6 rounded-xl bg-amber-50/70 border border-amber-200 text-center">
            <Sparkles className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-amber-900">
              Faculty Advisement in Progress
            </h4>
            <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto">
              Your student profile information has been submitted. Your assigned faculty adviser is currently reviewing your major grades and student classifications.
            </p>
          </div>
        )}
      </div>

      {/* Quick Action Navigation Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigateToTab('profile')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-left flex items-start justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <User className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Comprehensive Profiling Form
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Enter or update IP, PWD, religion, and medical information.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
        </button>

        <button
          onClick={() => onNavigateToTab('academics')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-left flex items-start justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              Academic Transcript & Major GWA
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Inspect recorded grades, major-subject breakdowns, and units.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
        </button>

        <button
          onClick={() => onNavigateToTab('summary')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-left flex items-start justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Printer className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
              Consolidated Profiling Dossier
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Preview and print official student profiling and advisement slip.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
        </button>
      </div>
    </div>
  );
};
