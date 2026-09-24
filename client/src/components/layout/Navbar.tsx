import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import logo from '../../assets/branding/coloredlogo.png';
import { ChevronDown, GraduationCap, LogOut, RotateCcw, ShieldCheck, Users } from 'lucide-react';
import { UserRole } from '../../types';

export const Navbar: React.FC = () => {
  const { currentUser, logout, resetAllData } = useApp();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const roleIcon = (role: UserRole) => {
    if (role === 'student') return <GraduationCap className="h-4 w-4 text-emerald-600" />;
    if (role === 'faculty') return <Users className="h-4 w-4 text-indigo-600" />;
    return <ShieldCheck className="h-4 w-4 text-amber-600" />;
  };

  const roleClass = currentUser?.role === 'student'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : currentUser?.role === 'faculty'
      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
      : 'bg-amber-50 text-amber-700 border-amber-200';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Bukidnon State University logo" className="h-10 w-10 object-contain brightness-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-slate-900">SAPES</span>
              <span className="hidden rounded-md border border-indigo-200/60 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700 sm:inline-block">
                A.Y. 2026-2027 • 1st Sem
              </span>
            </div>
            <p className="mt-0.5 hidden text-[11px] leading-none text-slate-500 md:block">
              Student Enrollment & Academic Status Management System
            </p>
          </div>
        </div>

        {currentUser && (
          <nav aria-label="Role navigation" className="hidden items-center gap-3 text-xs font-semibold text-slate-500 lg:flex">
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">Dashboard</span>
            {currentUser.role === 'faculty' && <><span>Student Search</span><span>Evaluations</span><span>Academic Records</span></>}
            {currentUser.role === 'admin' && <><span>User Management</span><span>Audit Logs</span></>}
            {currentUser.role === 'student' && <span>Academic Records</span>}
          </nav>
        )}

        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen((open) => !open)}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-1.5 pr-3 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                {currentUser.fullName.split(' ').map((name) => name[0]).slice(0, 2).join('')}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-slate-800">{currentUser.fullName}</div>
                <span className={`mt-0.5 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${roleClass}`}>
                  {roleIcon(currentUser.role)} {currentUser.role.toUpperCase()}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {isUserMenuOpen && (
              <>
                <button aria-label="Close user menu" className="fixed inset-0 z-40 h-full w-full cursor-default" onClick={() => setIsUserMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 text-xs shadow-xl">
                  <div className="mb-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="font-bold text-slate-800">{currentUser.fullName}</p>
                    <p className="truncate text-slate-500">{currentUser.username}</p>
                  </div>
                  <button
                    onClick={async () => { await logout(); setIsUserMenuOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 font-medium text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Log out
                  </button>
                  {currentUser.role === 'admin' && (
                    <button
                      onClick={() => { setShowResetConfirm(true); setIsUserMenuOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-slate-600 hover:bg-slate-100"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reset local demo data
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <h4 className="mb-2 font-bold text-slate-900">Reset local demo data?</h4>
            <p className="mb-6 text-xs text-slate-500">This does not change records in the backend.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold">Cancel</button>
              <button onClick={() => { resetAllData(); setShowResetConfirm(false); }} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white">Reset</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
