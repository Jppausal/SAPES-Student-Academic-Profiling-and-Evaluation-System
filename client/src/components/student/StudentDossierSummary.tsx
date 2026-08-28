import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Printer,
  FileCheck2,
  GraduationCap,
  HeartPulse,
  Church,
  Layers,
  User,
  ShieldCheck,
  Building2,
  Sparkles,
} from 'lucide-react';
import { EvaluationBadge, AcademicStatusBadge, Badge } from '../common/Badge';

export const StudentDossierSummary: React.FC = () => {
  const { currentStudentProfile, currentAcademicRecord, currentEvaluation } = useApp();

  if (!currentStudentProfile || !currentAcademicRecord) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-slate-500">No profile available to generate summary.</p>
      </div>
    );
  }

  const p = currentStudentProfile;
  const a = currentAcademicRecord;
  const e = currentEvaluation;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-indigo-600" />
            Consolidated Student Profiling & Advisement Dossier
          </h2>
          <p className="text-xs text-slate-500">
            Official university enrollment documentation and academic standing sheet.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          Print / Export PDF
        </button>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-lg print:border-none print:shadow-none max-w-4xl mx-auto text-slate-900 space-y-6">
        {/* University Header */}
        <div className="text-center pb-6 border-b-2 border-slate-900 space-y-1">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Republic of the Philippines • Office of Academic Affairs
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
            State University Academic Profiling & Enrollment System
          </h1>
          <p className="text-xs font-semibold text-indigo-900">
            Official Student Profiling, Special Classifications & Evaluation Dossier
          </p>
          <p className="text-[11px] text-slate-400 font-mono">
            Academic Year 2026-2027 • First Semester
          </p>
        </div>

        {/* Top Student Header Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Student Name:</span>
            <span className="font-extrabold text-sm text-slate-900">
              {p.personalInfo.lastName}, {p.personalInfo.firstName} {p.personalInfo.middleName}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Student Number:</span>
            <span className="font-mono font-bold text-slate-900">{p.studentNumber}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Degree Program:</span>
            <span className="font-bold text-slate-900">{p.program}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Year & Status:</span>
            <span className="font-bold text-slate-900">
              Year {p.yearLevel} • {a.academicStatus}
            </span>
          </div>
        </div>

        {/* Section 1: Demographic & Contact Profile */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-indigo-600" />
            I. Personal & Emergency Profile Information
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 text-xs">
            <div>
              <span className="text-slate-500">Date of Birth:</span>{' '}
              <strong className="text-slate-800">{p.personalInfo.dateOfBirth}</strong>
            </div>
            <div>
              <span className="text-slate-500">Gender / Status:</span>{' '}
              <strong className="text-slate-800">
                {p.personalInfo.gender} ({p.personalInfo.civilStatus})
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Citizenship:</span>{' '}
              <strong className="text-slate-800">{p.personalInfo.citizenship}</strong>
            </div>
            <div>
              <span className="text-slate-500">Contact Number:</span>{' '}
              <strong className="text-slate-800">{p.personalInfo.contactNumber}</strong>
            </div>
            <div>
              <span className="text-slate-500">University Email:</span>{' '}
              <strong className="text-slate-800 font-mono text-[11px]">
                {p.personalInfo.universityEmail}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Emergency Guardian:</span>{' '}
              <strong className="text-slate-800">
                {p.personalInfo.guardianName} ({p.personalInfo.guardianContact})
              </strong>
            </div>
          </div>
        </div>

        {/* Section 2: Special Student Classifications */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            II. Student Special Classifications (IP, PWD, Shifter, Transferee)
          </h3>
          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex flex-wrap gap-2">
              <Badge variant={p.classifications.isIP ? 'purple' : 'default'} size="sm">
                IP Group: {p.classifications.isIP ? p.classifications.ipGroupName : 'None'}
              </Badge>
              <Badge variant={p.classifications.isPWD ? 'info' : 'default'} size="sm">
                PWD: {p.classifications.isPWD ? p.classifications.pwdType : 'None'}
              </Badge>
              <Badge variant={p.classifications.isShifter ? 'amber' : 'default'} size="sm">
                Shifter: {p.classifications.isShifter ? 'Yes' : 'No'}
              </Badge>
              <Badge variant={p.classifications.isTransferee ? 'success' : 'default'} size="sm">
                Transferee: {p.classifications.isTransferee ? 'Yes' : 'No'}
              </Badge>
              <Badge variant={p.classifications.isWorkingStudent ? 'purple' : 'default'} size="sm">
                Working Student: {p.classifications.isWorkingStudent ? 'Yes' : 'No'}
              </Badge>
            </div>
            {p.classifications.requiresGroundFloor && (
              <p className="text-[11px] font-semibold text-indigo-900">
                ★ Requires Ground Floor / Elevator Accessible Classrooms.
              </p>
            )}
            {p.classifications.pwdDetails && (
              <p className="text-[11px] text-slate-600">
                PWD Accommodations: {p.classifications.pwdDetails}
              </p>
            )}
          </div>
        </div>

        {/* Section 3: Religious Observance & Health Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Religion */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Church className="w-3.5 h-3.5 text-amber-600" />
              III. Religion & Scheduling Observance
            </span>
            <p>
              <span className="text-slate-500">Affiliation:</span>{' '}
              <strong>{p.religionProfiling.religion}</strong>
            </p>
            <p>
              <span className="text-slate-500">Restricted Periods:</span>{' '}
              <strong>{p.religionProfiling.restrictedDays?.join(', ') || 'None'}</strong>
            </p>
            {p.religionProfiling.observanceDetails && (
              <p className="text-[11px] italic text-slate-600">
                "{p.religionProfiling.observanceDetails}"
              </p>
            )}
          </div>

          {/* Health */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
              IV. Authorized Health & Lab Safety
            </span>
            <p>
              <span className="text-slate-500">Blood Type:</span>{' '}
              <strong className="font-mono text-rose-700">
                {p.healthMedicalProfiling.bloodType}
              </strong>
            </p>
            <p>
              <span className="text-slate-500">Allergies/Conditions:</span>{' '}
              <strong>
                {p.healthMedicalProfiling.allergies ||
                  p.healthMedicalProfiling.chronicConditions ||
                  'None reported'}
              </strong>
            </p>
            <p>
              <span className="text-slate-500">Faculty Consent:</span>{' '}
              <strong className="text-emerald-700">
                {p.healthMedicalProfiling.authorizedForFacultyEvaluation
                  ? 'Authorized'
                  : 'Withheld'}
              </strong>
            </p>
          </div>
        </div>

        {/* Section 4: Academic Performance & Major GWA */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              V. Academic Performance & Major-Subject Evaluation
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <span>
                Major GWA:{' '}
                <strong className="font-mono text-indigo-900 font-black text-sm">
                  {a.majorSubjectGWA.toFixed(2)}
                </strong>
              </span>
              <span>
                Overall GWA:{' '}
                <strong className="font-mono text-slate-900 font-bold">
                  {a.overallGWA.toFixed(2)}
                </strong>
              </span>
            </div>
          </div>

          <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-2">Code</th>
                <th className="p-2">Subject Title</th>
                <th className="p-2 text-center">Type</th>
                <th className="p-2 text-center">Units</th>
                <th className="p-2 text-center">Grade</th>
                <th className="p-2 text-center">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {a.subjects.map((s) => (
                <tr key={s.code}>
                  <td className="p-2 font-mono font-bold">{s.code}</td>
                  <td className="p-2">{s.title}</td>
                  <td className="p-2 text-center">
                    {s.isMajor ? (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                        Major
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">GE</span>
                    )}
                  </td>
                  <td className="p-2 text-center font-mono">{s.units}</td>
                  <td className="p-2 text-center font-mono font-bold">
                    {s.grade.toFixed(2)}
                  </td>
                  <td className="p-2 text-center">
                    <span
                      className={`text-[10px] font-bold ${
                        s.remarks === 'Passed' ? 'text-emerald-700' : 'text-rose-700'
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

        {/* Section 5: Faculty Advisement Outcome */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-700" />
              VI. Faculty Advisement & Official Enrollment Status
            </span>
            {e ? (
              <EvaluationBadge status={e.evaluationStatus} size="sm" />
            ) : (
              <EvaluationBadge status="Pending" size="sm" />
            )}
          </div>
          {e ? (
            <div className="space-y-1 text-slate-700">
              <p>
                <strong>Evaluator:</strong> {e.facultyName} (Evaluated on{' '}
                {new Date(e.evaluatedAt).toLocaleDateString()})
              </p>
              <p>
                <strong>Evaluation Remarks:</strong> "{e.remarks}"
              </p>
              <p>
                <strong>Recommended Section:</strong> {e.recommendedSection || 'Regular block'}
              </p>
            </div>
          ) : (
            <p className="text-slate-500 italic">Evaluation currently in progress.</p>
          )}
        </div>

        {/* Signature Lines */}
        <div className="grid grid-cols-3 gap-6 pt-8 text-center text-xs">
          <div className="border-t border-slate-400 pt-2">
            <p className="font-bold text-slate-900">
              {p.personalInfo.firstName} {p.personalInfo.lastName}
            </p>
            <p className="text-[11px] text-slate-500">Student Signature</p>
          </div>

          <div className="border-t border-slate-400 pt-2">
            <p className="font-bold text-slate-900">
              {e?.facultyName || 'Faculty Academic Adviser'}
            </p>
            <p className="text-[11px] text-slate-500">Department Evaluator</p>
          </div>

          <div className="border-t border-slate-400 pt-2">
            <p className="font-bold text-slate-900">Engr. Maricel Santos</p>
            <p className="text-[11px] text-slate-500">University Registrar</p>
          </div>
        </div>
      </div>
    </div>
  );
};
