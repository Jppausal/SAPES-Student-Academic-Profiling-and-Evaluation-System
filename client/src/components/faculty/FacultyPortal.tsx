import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StudentProfile, AcademicRecord, FacultyEvaluation } from '../../types';
import { EvaluationBadge, AcademicStatusBadge, Badge } from '../common/Badge';
import { EvaluationDossierModal } from './EvaluationDossierModal';
import {
  Users,
  Search,
  Filter,
  GraduationCap,
  AlertTriangle,
  FileCheck2,
  Layers,
  HeartPulse,
  Church,
  Eye,
  Edit3,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

export const FacultyPortal: React.FC = () => {
  const { currentUser, students, academicRecords, evaluations } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<
    'all' | 'pending' | 'probation' | 'pwd' | 'ip' | 'religion' | 'eligible'
  >('all');

  // Selected student for detailed Evaluation Dossier
  const [selectedStudentNumber, setSelectedStudentNumber] = useState<string | null>(null);

  // Combine student profile, academic record, and evaluation data for clean table/card mapping
  const consolidatedList = useMemo(() => {
    return students.map((s) => {
      const academic =
        academicRecords.find((a) => a.studentNumber === s.studentNumber) || {
          studentNumber: s.studentNumber,
          program: s.program,
          curriculumYear: '2023 Curriculum',
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

      const evalData = evaluations.find((e) => e.studentNumber === s.studentNumber) || null;

      return {
        student: s,
        academic,
        evaluation: evalData,
      };
    });
  }, [students, academicRecords, evaluations]);

  // Filtered List based on search query and category filter
  const filteredList = useMemo(() => {
    return consolidatedList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.student.studentNumber.toLowerCase().includes(q) ||
        item.student.personalInfo.firstName.toLowerCase().includes(q) ||
        item.student.personalInfo.lastName.toLowerCase().includes(q) ||
        item.student.program.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      switch (filterCategory) {
        case 'pending':
          return !item.evaluation || item.evaluation.evaluationStatus === 'Pending';
        case 'probation':
          return item.academic.isUnderProbation;
        case 'pwd':
          return item.student.classifications.isPWD;
        case 'ip':
          return item.student.classifications.isIP;
        case 'religion':
          return item.student.religionProfiling.hasSchedulingObservance;
        case 'eligible':
          return item.evaluation?.evaluationStatus === 'Eligible';
        default:
          return true;
      }
    });
  }, [consolidatedList, searchQuery, filterCategory]);

  // Quick stats
  const stats = useMemo(() => {
    const total = consolidatedList.length;
    const evaluated = consolidatedList.filter(
      (c) => c.evaluation && c.evaluation.evaluationStatus !== 'Pending'
    ).length;
    const probation = consolidatedList.filter((c) => c.academic.isUnderProbation).length;
    const pwdOrIp = consolidatedList.filter(
      (c) => c.student.classifications.isPWD || c.student.classifications.isIP
    ).length;
    return { total, evaluated, pending: total - evaluated, probation, pwdOrIp };
  }, [consolidatedList]);

  // Target student for modal
  const activeStudentData = consolidatedList.find(
    (c) => c.student.studentNumber === selectedStudentNumber
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
              Faculty Evaluator Workspace
            </span>
            <span className="text-xs text-slate-300 font-mono">
              Evaluator: {currentUser?.fullName || 'Faculty Member'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Student Academic & Profiling Evaluation Management
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Search students by Student Number, review automatically calculated Major-Subject GWA, assess special classifications (IP/PWD/Religion/Health), and assign official enrollment eligibility.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-4 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] text-slate-300 uppercase tracking-wider block font-medium">
              Assigned Pool
            </span>
            <span className="text-2xl font-black text-white font-mono">{stats.total}</span>
          </div>
          <div className="px-4 py-3 bg-emerald-500/20 backdrop-blur-md rounded-2xl border border-emerald-500/30 text-center">
            <span className="text-[10px] text-emerald-300 uppercase tracking-wider block font-medium">
              Completed
            </span>
            <span className="text-2xl font-black text-emerald-300 font-mono">
              {stats.evaluated}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Pending Review</span>
          <span className="text-2xl font-black text-amber-600 font-mono mt-1 block">
            {stats.pending}
          </span>
          <span className="text-[11px] text-slate-400">Awaiting evaluation</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Academic Probation</span>
          <span className="text-2xl font-black text-rose-600 font-mono mt-1 block">
            {stats.probation}
          </span>
          <span className="text-[11px] text-slate-400">Requires remedial hold</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Special Profiling (PWD/IP)</span>
          <span className="text-2xl font-black text-purple-600 font-mono mt-1 block">
            {stats.pwdOrIp}
          </span>
          <span className="text-[11px] text-slate-400">Classroom accommodations</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Evaluation Pass Rate</span>
          <span className="text-2xl font-black text-indigo-600 font-mono mt-1 block">
            {stats.total > 0
              ? `${Math.round(
                  (consolidatedList.filter((c) => c.evaluation?.evaluationStatus === 'Eligible')
                    .length /
                    stats.total) *
                    100
                )}%`
              : '0%'}
          </span>
          <span className="text-[11px] text-slate-400">Cleared for enrollment</span>
        </div>
      </div>

      {/* Search and Filter Controls (Satisfies Requirement: Search for student using student number) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Student Number (e.g. 2023-01452) or Student Name..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-900 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Result Count */}
          <span className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-900">{filteredList.length}</strong> of{' '}
            {consolidatedList.length} students
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mr-1 shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter By:
          </span>

          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
              filterCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Students ({consolidatedList.length})
          </button>

          <button
            onClick={() => setFilterCategory('pending')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
              filterCategory === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Pending Review ({stats.pending})
          </button>

          <button
            onClick={() => setFilterCategory('probation')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
              filterCategory === 'probation'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Academic Probation ({stats.probation})
          </button>

          <button
            onClick={() => setFilterCategory('pwd')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
              filterCategory === 'pwd'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
            }`}
          >
            PWD Accommodations
          </button>

          <button
            onClick={() => setFilterCategory('ip')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
              filterCategory === 'ip'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            Indigenous Peoples (IP)
          </button>

          <button
            onClick={() => setFilterCategory('religion')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
              filterCategory === 'religion'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Sabbath / Religious Observance
          </button>
        </div>
      </div>

      {/* Student Dossier Table (Satisfies Requirement: Consolidated student report containing grades, major GWA, classifications, profile, and evaluation status) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student Info</th>
                <th className="py-3 px-4">Program & Year</th>
                <th className="py-3 px-4 text-center">Major GWA (Auto)</th>
                <th className="py-3 px-4">Special Classifications</th>
                <th className="py-3 px-4">Religion / Medical Notes</th>
                <th className="py-3 px-4">Evaluation Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No students match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredList.map(({ student, academic, evaluation }) => (
                  <tr
                    key={student.studentNumber}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      academic.isUnderProbation ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    {/* Student Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs">
                        {student.personalInfo.lastName}, {student.personalInfo.firstName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>#{student.studentNumber}</span>
                        {academic.isUnderProbation && (
                          <span className="text-[10px] text-rose-600 font-bold">
                            (Probation)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Program & Standing */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 truncate max-w-[180px]">
                        {student.program}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1">
                        <AcademicStatusBadge
                          status={academic.academicStatus}
                          isProbation={academic.isUnderProbation}
                          size="sm"
                        />
                      </div>
                    </td>

                    {/* Computed Major GWA */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="font-mono font-black text-sm text-indigo-900">
                        {academic.majorSubjectGWA > 0
                          ? academic.majorSubjectGWA.toFixed(2)
                          : '0.00'}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Overall: {academic.overallGWA.toFixed(2)}
                      </span>
                    </td>

                    {/* Classifications */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {student.classifications.isIP && (
                          <Badge variant="purple" size="sm">
                            IP: {student.classifications.ipGroupName || 'Member'}
                          </Badge>
                        )}
                        {student.classifications.isPWD && (
                          <Badge variant="info" size="sm">
                            PWD: {student.classifications.pwdType}
                          </Badge>
                        )}
                        {student.classifications.isShifter && (
                          <Badge variant="amber" size="sm">
                            Shifter
                          </Badge>
                        )}
                        {student.classifications.isTransferee && (
                          <Badge variant="success" size="sm">
                            Transferee
                          </Badge>
                        )}
                        {!student.classifications.isIP &&
                          !student.classifications.isPWD &&
                          !student.classifications.isShifter &&
                          !student.classifications.isTransferee && (
                            <span className="text-slate-400 italic">None</span>
                          )}
                      </div>
                    </td>

                    {/* Religion & Medical */}
                    <td className="py-3.5 px-4">
                      <div className="text-[11px] text-slate-700 max-w-[180px] truncate">
                        <span className="font-semibold text-slate-800">
                          {student.religionProfiling.religion}
                        </span>
                        {student.religionProfiling.restrictedDays?.length ? (
                          <span className="text-amber-800 block text-[10px]">
                            ⚠ Restricted: {student.religionProfiling.restrictedDays.join(', ')}
                          </span>
                        ) : null}
                        {student.healthMedicalProfiling.chronicConditions && (
                          <span className="text-rose-700 block text-[10px] truncate">
                            ♥ {student.healthMedicalProfiling.chronicConditions}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Evaluation Status */}
                    <td className="py-3.5 px-4">
                      {evaluation ? (
                        <EvaluationBadge status={evaluation.evaluationStatus} size="sm" />
                      ) : (
                        <EvaluationBadge status="Pending" size="sm" />
                      )}
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedStudentNumber(student.studentNumber)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-bold transition-all flex items-center gap-1.5 ml-auto shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Evaluate Dossier
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluation Dossier Modal */}
      {activeStudentData && (
        <EvaluationDossierModal
          isOpen={!!selectedStudentNumber}
          onClose={() => setSelectedStudentNumber(null)}
          student={activeStudentData.student}
          academicRecord={activeStudentData.academic}
          existingEvaluation={activeStudentData.evaluation}
        />
      )}
    </div>
  );
};
