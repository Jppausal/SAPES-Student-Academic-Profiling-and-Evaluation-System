import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  StudentProfile,
  AcademicRecord,
  AcademicStatus,
  SubjectGrade,
} from '../../types';
import { Modal } from '../common/Modal';
import {
  GraduationCap,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { AcademicStatusBadge } from '../common/Badge';

interface AcademicRecordManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile;
  academicRecord: AcademicRecord;
}

export const AcademicRecordManagerModal: React.FC<AcademicRecordManagerModalProps> = ({
  isOpen,
  onClose,
  student,
  academicRecord,
}) => {
  const {
    updateAcademicRecord,
    toggleAcademicProbation,
    updateAcademicStatus,
    addSubjectGrade,
    updateSubjectGrade,
    deleteSubjectGrade,
  } = useApp();

  const [status, setStatus] = useState<AcademicStatus>(academicRecord.academicStatus);
  const [isProbation, setIsProbation] = useState(academicRecord.isUnderProbation);
  const [probationReason, setProbationReason] = useState(
    academicRecord.probationReason || ''
  );
  const [maxAllowedUnits, setMaxAllowedUnits] = useState(academicRecord.maxAllowedUnits);

  // New subject state
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newUnits, setNewUnits] = useState(3);
  const [newIsMajor, setNewIsMajor] = useState(true);
  const [newGrade, setNewGrade] = useState(1.5);
  const [newRemarks, setNewRemarks] = useState<'Passed' | 'Failed' | 'Incomplete' | 'Ongoing'>(
    'Passed'
  );
  const [newTerm, setNewTerm] = useState('2nd Sem 2025-2026');

  const handleSaveAcademicChanges = () => {
    updateAcademicStatus(student.studentNumber, status);
    toggleAcademicProbation(student.studentNumber, isProbation, probationReason);
    updateAcademicRecord(student.studentNumber, {
      maxAllowedUnits,
    });
    onClose();
  };

  const handleAddNewSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newTitle) return;

    addSubjectGrade(student.studentNumber, {
      code: newCode.toUpperCase(),
      title: newTitle,
      units: newUnits,
      isMajor: newIsMajor,
      grade: newGrade,
      remarks: newRemarks,
      term: newTerm,
    });

    // Reset form
    setNewCode('');
    setNewTitle('');
    setShowAddSubject(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Maintain Academic Record & Status — #${student.studentNumber}`}
      subtitle={`${student.personalInfo.lastName}, ${student.personalInfo.firstName} • ${student.program}`}
      maxWidth="3xl"
      actions={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAcademicChanges}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-4 h-4" />
            Save Status & Record
          </button>
        </div>
      }
    >
      <div className="space-y-6 text-xs">
        {/* Status Maintenance Banner */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Student Academic Standing / Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => {
                  const newSt = e.target.value as AcademicStatus;
                  setStatus(newSt);
                  if (newSt === 'Academic Probation') setIsProbation(true);
                  else if (newSt === 'Regular') setIsProbation(false);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white outline-none font-bold"
              >
                <option value="Regular">Regular Standing</option>
                <option value="Academic Probation">Academic Probation</option>
                <option value="Shifter">Shifter Student</option>
                <option value="Transferee">Transferee Student</option>
                <option value="On Leave">On Leave of Absence (LOA)</option>
                <option value="Dropped">Dropped / Inactive</option>
                <option value="Graduating">Graduating Senior</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Max Allowed Enrollment Load (Units)
              </label>
              <input
                type="number"
                value={maxAllowedUnits}
                onChange={(e) => setMaxAllowedUnits(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white outline-none font-mono font-bold"
              />
            </div>
          </div>

          {/* Probation Flag */}
          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-900">
              <input
                type="checkbox"
                checked={isProbation}
                onChange={(e) => {
                  setIsProbation(e.target.checked);
                  if (e.target.checked) setStatus('Academic Probation');
                }}
                className="w-4 h-4 text-rose-600 rounded"
              />
              <span>Flag Student Under Academic Probation</span>
            </label>

            {isProbation && (
              <div className="pl-6 space-y-1">
                <label className="block text-[11px] font-semibold text-rose-800">
                  Probation Reason / Prerequisite Deficiency Notes
                </label>
                <input
                  type="text"
                  value={probationReason}
                  onChange={(e) => setProbationReason(e.target.value)}
                  className="w-full px-3 py-1.5 border border-rose-300 rounded-lg bg-white outline-none text-slate-800 text-xs"
                  placeholder="e.g., Major GWA deficiency (>3.00), failed 2 core prerequisite subjects."
                />
              </div>
            )}
          </div>
        </div>

        {/* Live Computed GWA Summary */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-950 text-white shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">
              Auto-Computed Major GWA:
            </span>
            <div className="text-xl font-black font-mono mt-0.5">
              {academicRecord.majorSubjectGWA.toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Overall Academic GWA:
            </span>
            <div className="text-lg font-bold font-mono text-slate-200 mt-0.5">
              {academicRecord.overallGWA.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Subject Courses & Major Flag Management */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              Manage Course Subjects & Major GWA Configuration
            </h4>
            <button
              onClick={() => setShowAddSubject(!showAddSubject)}
              className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Course Grade
            </button>
          </div>

          {/* Add Subject Sub-Form */}
          {showAddSubject && (
            <form
              onSubmit={handleAddNewSubject}
              className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-3 animate-in fade-in"
            >
              <h5 className="font-bold text-indigo-950">Add Recorded Subject Grade</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg uppercase font-mono font-bold"
                    placeholder="e.g., IT315"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Descriptive Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                    placeholder="e.g., Mobile Application Development"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Units
                  </label>
                  <input
                    type="number"
                    value={newUnits}
                    onChange={(e) => setNewUnits(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Grade (1.0 - 5.0)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={newGrade}
                    onChange={(e) => setNewGrade(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Remark
                  </label>
                  <select
                    value={newRemarks}
                    onChange={(e) => setNewRemarks(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="Passed">Passed</option>
                    <option value="Failed">Failed</option>
                    <option value="Incomplete">Incomplete</option>
                    <option value="Ongoing">Ongoing</option>
                  </select>
                </div>
                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-indigo-900">
                    <input
                      type="checkbox"
                      checked={newIsMajor}
                      onChange={(e) => setNewIsMajor(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span>Is Major Subject?</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddSubject(false)}
                  className="px-3 py-1 text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-indigo-600 text-white font-bold rounded-lg shadow-xs"
                >
                  Add Course
                </button>
              </div>
            </form>
          )}

          {/* Subjects Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Code</th>
                  <th className="p-2.5">Title</th>
                  <th className="p-2.5 text-center">Major Flag</th>
                  <th className="p-2.5 text-center">Units</th>
                  <th className="p-2.5 text-center">Grade</th>
                  <th className="p-2.5 text-center">Remark</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {academicRecord.subjects.map((s) => (
                  <tr key={s.code} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono font-bold">{s.code}</td>
                    <td className="p-2.5 font-medium">{s.title}</td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          updateSubjectGrade(student.studentNumber, s.code, {
                            isMajor: !s.isMajor,
                          })
                        }
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          s.isMajor
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Click to toggle Major vs GE subject for auto-computed GWA"
                      >
                        {s.isMajor ? '★ Major (Factor in GWA)' : 'General Ed'}
                      </button>
                    </td>
                    <td className="p-2.5 text-center font-mono">{s.units}</td>
                    <td className="p-2.5 text-center font-mono font-bold">
                      <input
                        type="number"
                        step="0.25"
                        value={s.grade}
                        onChange={(e) =>
                          updateSubjectGrade(student.studentNumber, s.code, {
                            grade: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-14 px-1.5 py-0.5 text-center border border-slate-200 rounded font-mono font-bold bg-white"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <select
                        value={s.remarks}
                        onChange={(e) =>
                          updateSubjectGrade(student.studentNumber, s.code, {
                            remarks: e.target.value as any,
                          })
                        }
                        className="px-1.5 py-0.5 border border-slate-200 rounded text-[11px] bg-white"
                      >
                        <option value="Passed">Passed</option>
                        <option value="Failed">Failed</option>
                        <option value="Incomplete">Incomplete</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Dropped">Dropped</option>
                      </select>
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => deleteSubjectGrade(student.studentNumber, s.code)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete Course"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};
