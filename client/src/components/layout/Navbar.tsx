import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  GraduationCap,
  Users,
  ShieldCheck,
  LogOut,
  UserCheck,
  ChevronDown,
  RotateCcw,
  Sparkles,
  School,
} from 'lucide-react';
import { UserRole } from '../../types';

export const Navbar: React.FC = () => {
  const { currentUser, users, switchUser, logout, resetAllData } = useApp();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Group users by role for quick test switcher
  const studentsList = users.filter((u) => u.role === 'student' && u.isActive);
  const facultyList = users.filter((u) => u.role === 'faculty' && u.isActive);
  const adminList = users.filter((u) => u.role === 'admin' && u.isActive);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'student':
        return <GraduationCap className="w-4 h-4 text-emerald-600" />;
      case 'faculty':
        return <Users className="w-4 h-4 text-indigo-600" />;
      case 'admin':
        return <ShieldCheck className="w-4 h-4 text-amber-600" />;
    }
  };

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'student':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'faculty':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'admin':
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & System Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-900 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-900/10">
              <School className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  SEASMS
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  A.Y. 2026-2027 • 1st Sem
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block leading-none mt-0.5">
                Student Enrollment & Academic Status Management System
              </p>
            </div>
          </div>

          {/* Center: Role Switcher Toolbar (Designed for effortless functional requirement testing) */}
          <div className="hidden lg:flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 px-2.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Switch Role Portal:
            </span>

            {/* Quick Student Switcher */}
            <div className="relative group">
              <button
                onClick={() => {
                  const student = studentsList[0];
                  if (student) switchUser(student.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  currentUser?.role === 'student'
                    ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                Student Portal
              </button>
            </div>

            {/* Quick Faculty Switcher */}
            <div className="relative group">
              <button
                onClick={() => {
                  const fac = facultyList[0];
                  if (fac) switchUser(fac.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  currentUser?.role === 'faculty'
                    ? 'bg-white text-indigo-800 shadow-xs border border-indigo-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                Faculty Evaluator
              </button>
            </div>

            {/* Quick Admin Switcher */}
            <div className="relative group">
              <button
                onClick={() => {
                  const admin = adminList[0];
                  if (admin) switchUser(admin.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  currentUser?.role === 'admin'
                    ? 'bg-white text-amber-900 shadow-xs border border-amber-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                Registrar Admin
              </button>
            </div>
          </div>

          {/* Right: User Menu & Session */}
          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {currentUser.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs font-bold text-slate-800 leading-tight">
                      {currentUser.fullName}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold border ${getRoleBadgeClass(
                          currentUser.role
                        )}`}
                      >
                        {currentUser.role.toUpperCase()}
                      </span>
                      {currentUser.studentNumber && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          #{currentUser.studentNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 p-2 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl mb-2 border border-slate-100">
                        <p className="font-bold text-slate-800 text-sm">
                          {currentUser.fullName}
                        </p>
                        <p className="text-slate-500 text-[11px] truncate">
                          {currentUser.email}
                        </p>
                        <p className="text-slate-500 text-[11px] mt-1">
                          <span className="font-medium text-slate-700">Dept:</span>{' '}
                          {currentUser.department}
                        </p>
                      </div>

                      <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Switch Specific Test Account:
                      </div>

                      {/* Students List */}
                      <div className="space-y-0.5 mb-2">
                        {studentsList.map((stu) => (
                          <button
                            key={stu.id}
                            onClick={() => {
                              switchUser(stu.id);
                              setIsUserMenuOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                              currentUser.id === stu.id
                                ? 'bg-emerald-50 text-emerald-900 font-bold'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span className="truncate">{stu.fullName}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {stu.studentNumber}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="border-t border-slate-100 my-1"></div>

                      {/* Faculty List */}
                      <div className="space-y-0.5 mb-2">
                        {facultyList.map((fac) => (
                          <button
                            key={fac.id}
                            onClick={() => {
                              switchUser(fac.id);
                              setIsUserMenuOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                              currentUser.id === fac.id
                                ? 'bg-indigo-50 text-indigo-900 font-bold'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span className="truncate">{fac.fullName}</span>
                            <span className="text-[10px] text-indigo-600 font-semibold">
                              Faculty Evaluator
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="border-t border-slate-100 my-1"></div>

                      {/* Admin List */}
                      <div className="space-y-0.5 mb-2">
                        {adminList.map((adm) => (
                          <button
                            key={adm.id}
                            onClick={() => {
                              switchUser(adm.id);
                              setIsUserMenuOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                              currentUser.id === adm.id
                                ? 'bg-amber-50 text-amber-900 font-bold'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span className="truncate">{adm.fullName}</span>
                            <span className="text-[10px] text-amber-700 font-semibold">
                              Registrar Admin
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="border-t border-slate-100 pt-1 space-y-1">
                        <button
                          onClick={() => {
                            setShowResetConfirm(true);
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center gap-2"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                          Reset All Demo Data
                        </button>
                        <button
                          onClick={() => {
                            logout();
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Log Out of Session
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  const student = studentsList[0];
                  if (student) switchUser(student.id);
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm"
              >
                <UserCheck className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reset Data Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-1">
              Reset All Demo Data?
            </h4>
            <p className="text-xs text-slate-500 mb-6">
              This will restore all student profiles, evaluations, academic records, and accounts to the initial default state.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetAllData();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 shadow-xs"
              >
                Yes, Reset Data
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
