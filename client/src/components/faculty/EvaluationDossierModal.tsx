import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  StudentProfile,
  AcademicRecord,
  FacultyEvaluation,
  EvaluationStatus,
} from '../../types';
import { Modal } from '../common/Modal';
import { EvaluationBadge, AcademicStatusBadge, Badge } from '../common/Badge';
import {
  GraduationCap,
  Layers,
  Church,
  HeartPulse,
  User,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Save,
  Building2,
  Clock,
  Calendar,
} from 'lucide-react';
import { getGradeQualityDescription } from '../../utils/academicCalculators';

interface EvaluationDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile;
  academicRecord: AcademicRecord;
  existingEvaluation?: FacultyEvaluation | null;
}

export const EvaluationDossierModal: React.FC<EvaluationDossierModalProps> = ({
  isOpen,
  onClose,
  student,
  academicRecord,
  existingEvaluation,
}) => {
  const { currentUser, saveFacultyEvaluation } = useApp();

  const p = student;
  const a = academicRecord;
  const gradeDesc = getGradeQualityDescription(a.majorSubjectGWA);

  // Form State for Faculty Evaluation
  const [status, setStatus] = useState<EvaluationStatus>(
    existingEvaluation?.evaluationStatus || 'Eligible'
  );
  const [remarks, setRemarks] = useState(
    existingEvaluation?.remarks ||
      (a.isUnderProbation
        ? 'Under academic probation due to deficient major courses. Limited to 15 units of remedial courses.'
        : 'Student meets all academic and profiling requirements for regular enrollment.')
  );
  const [recommendedSection, setRecommendedSection] = useState(
    existingEvaluation?.recommendedSection || `${p.section || 'BSIT-3A'} (Regular Block)`
  );
  const [maxUnits, setMaxUnits] = useState(
    existingEvaluation?.recommendedMaxUnits || (a.isUnderProbation ? 15 : a.maxAllowedUnits)
  );

  // Section Placement Considerations
  const [considerReligious, setConsiderReligious] = useState(
    existingEvaluation?.sectionPlacementConsiderations.religiousConsiderations ??
      p.religionProfiling.hasSchedulingObservance
  );
  const [religiousNotes, setReligiousNotes] = useState(
    existingEvaluation?.sectionPlacementConsiderations.religiousNotes ||
      (p.religionProfiling.hasSchedulingObservance
        ? `Observes ${p.religionProfiling.religion}. Avoid ${p.religionProfiling.restrictedDays?.join(', ') || 'restricted days'}.`
        : '')
  );

  const [considerHealth, setConsiderHealth] = useState(
    existingEvaluation?.sectionPlacementConsiderations.healthMobilityConsiderations ??
      (p.classifications.requiresGroundFloor || p.healthMedicalProfiling.physicalMobilityAssistanceNeeded)
  );
  const [healthNotes, setHealthNotes] = useState(
    existingEvaluation?.sectionPlacementConsiderations.healthMobilityNotes ||
      (p.classifications.requiresGroundFloor
        ? 'Requires ground floor classroom / elevator accessibility due to PWD mobility accommodation.'
        : '')
  );

  const [considerAcademic, setConsiderAcademic] = useState(
    existingEvaluation?.sectionPlacementConsiderations.academicSupportConsiderations ??
      a.isUnderProbation
  );
  const [academicNotes, setAcademicNotes] = useState(
    existingEvaluation?.sectionPlacementConsiderations.academicSupportNotes ||
      (a.isUnderProbation
        ? 'Refer to Department Academic Tutoring & Remedial Program for failed prerequisite subjects.'
        : '')
  );

  const [isSaved, setIsSaved] = useState(false);

  const handleSaveEvaluation = () => {
    saveFacultyEvaluation({
      studentNumber: p.studentNumber,
      facultyId: currentUser?.facultyId || currentUser?.id || 'FAC-001',
      facultyName: currentUser?.fullName || 'Faculty Evaluator',
      evaluationStatus: status,
      remarks,
      recommendedSection,
      recommendedMaxUnits: maxUnits,
      sectionPlacementConsiderations: {
        religiousConsiderations: considerReligious,
        religiousNotes: considerReligious ? religiousNotes : undefined,
        healthMobilityConsiderations: considerHealth,
        healthMobilityNotes: considerHealth ? healthNotes : undefined,
        academicSupportConsiderations: considerAcademic,
        academicSupportNotes: considerAcademic ? academicNotes : undefined,
      },
      isPublished: true,
    });

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  const majorSubjects = a.subjects.filter((s) => s.isMajor);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Consolidated Student Evaluation Dossier — #${p.studentNumber}`}
      subtitle={`${p.personalInfo.lastName}, ${p.personalInfo.firstName} • ${p.program} (Year ${p.yearLevel})`}
      maxWidth="4xl"
      actions={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {isSaved && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Evaluation Saved & Published!
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Close
            </button>
            <button
              onClick={handleSaveEvaluation}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Save & Assign Evaluation Status
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Summary Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Academic Standing */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Major-Subject GWA
              </span>
              <GraduationCap className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black font-mono text-white">
                {a.majorSubjectGWA > 0 ? a.majorSubjectGWA.toFixed(2) : '0.00'}
              </span>
              <span className="text-xs text-indigo-300">
                (Overall: {a.overallGWA.toFixed(2)})
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1">{gradeDesc.label}</p>
            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span>Status:</span>
              <AcademicStatusBadge
                status={a.academicStatus}
                isProbation={a.isUnderProbation}
                size="sm"
              />
            </div>
          </div>

          {/* Special Classifications */}
          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">
                Student Classifications
              </span>
              <Layers className="w-4 h-4 text-purple-600" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex flex-wrap gap-1">
                {p.classifications.isIP && (
                  <Badge variant="purple" size="sm">
                    IP: {p.classifications.ipGroupName}
                  </Badge>
                )}
                {p.classifications.isPWD && (
                  <Badge variant="info" size="sm">
                    PWD: {p.classifications.pwdType}
                  </Badge>
                )}
                {p.classifications.isShifter && (
                  <Badge variant="amber" size="sm">
                    Shifter
                  </Badge>
                )}
                {p.classifications.isTransferee && (
                  <Badge variant="success" size="sm">
                    Transferee ({p.classifications.creditedUnits} u)
                  </Badge>
                )}
                {!p.classifications.isIP &&
                  !p.classifications.isPWD &&
                  !p.classifications.isShifter &&
                  !p.classifications.isTransferee && (
                    <span className="text-slate-500 italic">None reported</span>
                  )}
              </div>
              {p.classifications.requiresGroundFloor && (
                <p className="text-[11px] font-bold text-purple-950 mt-1">
                  ⚠ Requires Ground Floor Room
                </p>
              )}
            </div>
          </div>

          {/* Religious & Health Profiling */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                Scheduling & Medical
              </span>
              <Church className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xs space-y-1 text-slate-800">
              <p>
                <strong className="text-amber-950">Religion:</strong> {p.religionProfiling.religion}
              </p>
              <p>
                <strong className="text-amber-950">Restricted Days:</strong>{' '}
                {p.religionProfiling.restrictedDays?.join(', ') || 'None'}
              </p>
              <p>
                <strong className="text-amber-950">Medical:</strong>{' '}
                {p.healthMedicalProfiling.chronicConditions ||
                  p.healthMedicalProfiling.allergies ||
                  'No chronic conditions'}
              </p>
            </div>
          </div>
        </div>

        {/* Academic Grades Transcript & Major Course Breakdown */}
        <div className="border border-slate-200 rounded-2xl p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              Academic Transcript & Course Grades
            </h4>
            <span className="text-xs font-semibold text-slate-500">
              {a.subjects.length} Total Enrolled Courses ({majorSubjects.length} Major)
            </span>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="p-2">Code</th>
                <th className="p-2">Subject Title</th>
                <th className="p-2 text-center">Type</th>
                <th className="p-2 text-center">Units</th>
                <th className="p-2 text-center">Grade</th>
                <th className="p-2 text-center">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {a.subjects.map((s) => (
                <tr
                  key={s.code}
                  className={s.remarks === 'Failed' ? 'bg-rose-50/50' : 'hover:bg-slate-50'}
                >
                  <td className="p-2 font-mono font-bold">{s.code}</td>
                  <td className="p-2">{s.title}</td>
                  <td className="p-2 text-center">
                    {s.isMajor ? (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                        Major
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">GE</span>
                    )}
                  </td>
                  <td className="p-2 text-center font-mono">{s.units}</td>
                  <td className="p-2 text-center font-mono font-bold">
                    <span className={s.remarks === 'Failed' ? 'text-rose-600' : 'text-slate-900'}>
                      {s.grade.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        s.remarks === 'Passed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : s.remarks === 'Failed'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {s.remarks}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section Placement Considerations (CRITICAL REQUIREMENT) */}
        <div className="border border-indigo-200 bg-indigo-50/40 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-200/60 pb-2">
            <div>
              <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Section Placement & Special Accommodation Analyzer
              </h4>
              <p className="text-[11px] text-indigo-800">
                Identify student profile factors requiring tailored class sectioning or room placement.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {/* Consideration 1: Religious Sabbath */}
            <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={considerReligious}
                  onChange={(e) => setConsiderReligious(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <span>Religious Scheduling Accommodation Flag</span>
              </label>
              {considerReligious && (
                <div className="pl-6">
                  <input
                    type="text"
                    value={religiousNotes}
                    onChange={(e) => setReligiousNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none"
                    placeholder="Instructions: e.g. Assign to weekday-only schedule, exclude Saturday exams."
                  />
                </div>
              )}
            </div>

            {/* Consideration 2: Health & PWD Mobility */}
            <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={considerHealth}
                  onChange={(e) => setConsiderHealth(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded"
                />
                <span>Health / PWD Mobility & Classroom Accessibility Flag</span>
              </label>
              {considerHealth && (
                <div className="pl-6">
                  <input
                    type="text"
                    value={healthNotes}
                    onChange={(e) => setHealthNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none"
                    placeholder="Instructions: e.g. Assign to Ground Floor West Wing laboratories only."
                  />
                </div>
              )}
            </div>

            {/* Consideration 3: Academic Probation Support */}
            <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={considerAcademic}
                  onChange={(e) => setConsiderAcademic(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span>Academic Remedial & Tutoring Referral Flag</span>
              </label>
              {considerAcademic && (
                <div className="pl-6">
                  <input
                    type="text"
                    value={academicNotes}
                    onChange={(e) => setAcademicNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none"
                    placeholder="Instructions: e.g. Enrolled in Peer Tutoring program for prerequisite repeat."
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* EVALUATION ACTION PANEL (Eligible / Not Eligible / For Review) */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Faculty Evaluation Decision & Official Remarks
            </h4>
            <span className="text-[11px] text-slate-500">
              Evaluator: {currentUser?.fullName || 'Faculty'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setStatus('Eligible')}
              className={`p-3.5 rounded-xl border text-center transition-all ${
                status === 'Eligible'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md font-bold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 text-sm mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Eligible</span>
              </div>
              <p className="text-[10px] opacity-90">Cleared for Regular Enrollment</p>
            </button>

            <button
              type="button"
              onClick={() => setStatus('For Review')}
              className={`p-3.5 rounded-xl border text-center transition-all ${
                status === 'For Review'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-md font-bold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 text-sm mb-1">
                <HelpCircle className="w-4 h-4" />
                <span>For Review</span>
              </div>
              <p className="text-[10px] opacity-90">Pending Profile / Schedule Alignment</p>
            </button>

            <button
              type="button"
              onClick={() => setStatus('Not Eligible')}
              className={`p-3.5 rounded-xl border text-center transition-all ${
                status === 'Not Eligible'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md font-bold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 text-sm mb-1">
                <XCircle className="w-4 h-4" />
                <span>Not Eligible</span>
              </div>
              <p className="text-[10px] opacity-90">Academic Probation / Prerequisite Hold</p>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Recommended Section Placement
              </label>
              <input
                type="text"
                value={recommendedSection}
                onChange={(e) => setRecommendedSection(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white outline-none"
                placeholder="e.g. BSIT-3A (Morning Block)"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Approved Max Allowed Units
              </label>
              <input
                type="number"
                value={maxUnits}
                onChange={(e) => setMaxUnits(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Official Evaluation Remarks & Justification <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Explain the academic and profile basis for assigning this status (e.g. Major GWA, prerequisite clearance, accessibility requirements)..."
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
