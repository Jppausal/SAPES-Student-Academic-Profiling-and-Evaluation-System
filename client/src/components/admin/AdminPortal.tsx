import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserAccount, StudentProfile, AcademicRecord } from '../../types';
import { UserManagementModal } from './UserManagementModal';
import { AcademicRecordManagerModal } from './AcademicRecordManagerModal';
import { AdminReportsView } from './AdminReportsView';
import { SystemAuditLogsView } from './SystemAuditLogsView';
import { AcademicStatusBadge, EvaluationBadge, Badge } from '../common/Badge';
import {
  Users,
  ShieldCheck,
  GraduationCap,
  FileCheck2,
  Activity,
  Plus,
  Edit3,
  UserX,
  UserCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const {
    currentUser,
    users,
    students,
    academicRecords,
    evaluations,
    deactivateUserAccount,
    reactivateUserAccount,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'users' | 'academic-records' | 'reports' | 'logs'
  >('users');

  // User Management Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserAccount | null>(null);

  // Academic Record Modal State
  const [academicModalStudent, setAcademicModalStudent] = useState<{
    student: StudentProfile;
    academic: AcademicRecord;
  } | null>(null);

  // User search
  const [userSearch, setUserSearch] = useState('');
  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  // Student academic search
  const [studentSearch, setStudentSearch] = useState('');
  const filteredStudents = students.filter((s) => {
    const q = studentSearch.toLowerCase();
    return (
      !q ||
      s.studentNumber.toLowerCase().includes(q) ||
      s.personalInfo.firstName.toLowerCase().includes(q) ||
      s.personalInfo.lastName.toLowerCase().includes(q) ||
      s.program.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
              Registrar & System Administrator
            </span>
            <span className="text-xs text-slate-300 font-mono">
              Admin: {currentUser?.fullName || 'Registrar Admin'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Academic Records & Security Management Portal
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Maintain authorized user access roles, student profiling records, academic probation statuses, Major-Subject GWA configurations, and real-time security audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setUserToEdit(null);
              setIsUserModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create User Account
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 shadow-xs max-w-full overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          User & Access Control ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('academic-records')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'academic-records'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Academic Records & Major GWA
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'reports'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          Institutional Analytics
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'logs'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          Security Audit Trail
        </button>
      </div>

      {/* TAB 1: USERS & ACCESS CONTROL */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user accounts by name, username, email, or role..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-900"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Total Accounts: <strong className="text-slate-900">{users.length}</strong>
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4">Role & Access Tier</th>
                    <th className="py-3 px-4">Identifier / ID</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        !u.isActive ? 'bg-slate-50/50 opacity-60' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{u.fullName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase ${
                            u.role === 'admin'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : u.role === 'faculty'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {u.role === 'admin' ? 'Registrar Admin' : u.role}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {u.studentNumber || u.facultyId || u.employeeId || 'N/A'}
                      </td>

                      <td className="py-3 px-4 text-slate-600">{u.department}</td>

                      <td className="py-3 px-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <UserCheck className="w-3 h-3 text-emerald-600" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            <UserX className="w-3 h-3 text-rose-600" /> Deactivated
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setUserToEdit(u);
                              setIsUserModalOpen(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit User Information"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {u.isActive ? (
                            <button
                              onClick={() => deactivateUserAccount(u.id)}
                              className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                              title="Deactivate Account"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => reactivateUserAccount(u.id)}
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200"
                              title="Reactivate Account"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACADEMIC RECORDS & MAJOR GWA CONFIGURATION */}
      {activeTab === 'academic-records' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students by student number, name, or degree program..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-900"
              />
            </div>
            <p className="text-xs text-slate-500">
              Click <strong className="text-indigo-600">"Manage Record & GWA"</strong> to toggle major subjects, add course grades, or set academic probation.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Degree Program</th>
                    <th className="py-3 px-4 text-center">Major GWA (Auto)</th>
                    <th className="py-3 px-4 text-center">Overall GWA</th>
                    <th className="py-3 px-4">Academic Status</th>
                    <th className="py-3 px-4 text-center">Courses Recorded</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((s) => {
                    const a =
                      academicRecords.find((rec) => rec.studentNumber === s.studentNumber) || {
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

                    return (
                      <tr
                        key={s.studentNumber}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          a.isUnderProbation ? 'bg-rose-50/30' : ''
                        }`}
                      >
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
                          <span className="text-[10px] text-slate-400">
                            Year {s.yearLevel} • {s.enrollmentTerm}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="font-mono font-black text-sm text-indigo-900">
                            {a.majorSubjectGWA > 0 ? a.majorSubjectGWA.toFixed(2) : '0.00'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="font-mono font-bold text-slate-700">
                            {a.overallGWA > 0 ? a.overallGWA.toFixed(2) : '0.00'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <AcademicStatusBadge
                            status={a.academicStatus}
                            isProbation={a.isUnderProbation}
                            size="sm"
                          />
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-600">
                          {a.subjects.length} Courses
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() =>
                              setAcademicModalStudent({
                                student: s,
                                academic: a,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-bold transition-all inline-flex items-center gap-1.5 shadow-2xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Manage Record & GWA
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INSTITUTIONAL REPORTS */}
      {activeTab === 'reports' && <AdminReportsView />}

      {/* TAB 4: SECURITY AUDIT TRAIL */}
      {activeTab === 'logs' && <SystemAuditLogsView />}

      {/* MODALS */}
      {isUserModalOpen && (
        <UserManagementModal
          isOpen={isUserModalOpen}
          onClose={() => {
            setIsUserModalOpen(false);
            setUserToEdit(null);
          }}
          userToEdit={userToEdit}
        />
      )}

      {academicModalStudent && (
        <AcademicRecordManagerModal
          isOpen={!!academicModalStudent}
          onClose={() => setAcademicModalStudent(null)}
          student={academicModalStudent.student}
          academicRecord={academicModalStudent.academic}
        />
      )}
    </div>
  );
};
