import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import logo from '../../assets/branding/logo ccot.jpg';
import { ChevronDown, GraduationCap, LogOut, RotateCcw, Search, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { FacultyPage, UserRole } from '../../types';
import { UserSettingsModal } from './UserSettingsModal';
import { fetchStudentSuggestions, StudentSuggestion } from '../../lib/api';
import { Modal } from '../common/Modal';
import { StudentProfilePhoto } from '../common/StudentProfilePhoto';

interface NavbarProps {
  activePage: FacultyPage;
  onNavigate: (page: FacultyPage) => void;
  onStudentSearch: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activePage, onNavigate, onStudentSearch }) => {
  const { currentUser, logout, resetAllData } = useApp();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isStudentSearchOpen, setIsStudentSearchOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentSuggestions, setStudentSuggestions] = useState<StudentSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const studentSearchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsUserMenuOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isUserMenuOpen]);

  useEffect(() => {
    if (!showResetConfirm) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowResetConfirm(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showResetConfirm]);

  const roleIcon = (role: UserRole) => {
    if (role === 'student') return <GraduationCap className="h-4 w-4 text-emerald-600" />;
    if (role === 'faculty') return <Users className="h-4 w-4 text-brand-600" />;
    return <ShieldCheck className="h-4 w-4 text-amber-600" />;
  };

  const roleClass = currentUser?.role === 'student'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : currentUser?.role === 'faculty'
      ? 'bg-brand-50 text-brand-700 border-brand-200'
      : 'bg-amber-50 text-amber-700 border-amber-200';
  const roleLabel = currentUser?.role === 'faculty' && currentUser.isVerifiedEnrollmentOfficer
    ? currentUser.designation || 'Enrollment Officer'
    : currentUser?.role.toUpperCase();
  const isFaculty = currentUser?.role === 'faculty';
  const navItemClass = (active: boolean) => `rounded-lg px-3 py-2 transition ${active
    ? 'bg-white/15 text-white'
    : 'text-brand-100 hover:bg-white/10 hover:text-white'}`;

  useEffect(() => {
    const query = studentSearchQuery.trim();
    if (!isStudentSearchOpen || !query) {
      setStudentSuggestions([]);
      setSuggestionsOpen(false);
      setSuggestionsLoading(false);
      setSuggestionsError('');
      return;
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      setSuggestionsError('');
      try {
        const matches = await fetchStudentSuggestions(query);
        if (!active) return;
        setStudentSuggestions(matches);
        setSuggestionsOpen(true);
        setActiveSuggestionIndex(-1);
      } catch (requestError) {
        if (!active) return;
        setStudentSuggestions([]);
        setSuggestionsError(requestError instanceof Error ? requestError.message : 'Unable to load student suggestions.');
        setSuggestionsOpen(true);
      } finally {
        if (active) setSuggestionsLoading(false);
      }
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [isStudentSearchOpen, studentSearchQuery]);

  const openStudentSearch = () => {
    setIsStudentSearchOpen(true);
    window.setTimeout(() => studentSearchInput.current?.focus(), 0);
  };

  const closeStudentSearch = () => {
    setIsStudentSearchOpen(false);
    setStudentSearchQuery('');
    setStudentSuggestions([]);
    setSuggestionsOpen(false);
    setSuggestionsError('');
  };

  const selectStudent = (student: StudentSuggestion) => {
    onStudentSearch(student.institutionId);
    closeStudentSearch();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-brand-800 bg-brand-700 shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <img src={logo} alt="College of Technologies logo" className="h-10 w-10 rounded-full bg-white object-contain p-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white">SAPES</span>
            </div>
            <p className="mt-0.5 hidden text-[11px] leading-none text-brand-200 md:block">
              Student Enrollment & Academic Status Management System
            </p>
          </div>
        </div>

        {currentUser && currentUser.role === 'admin' && (
          <nav aria-label="Role navigation" className="hidden items-center gap-3 text-xs font-semibold text-brand-100 lg:flex">
            <button type="button" onClick={() => onNavigate('dashboard')} aria-current={activePage === 'dashboard' ? 'page' : undefined} className={navItemClass(activePage === 'dashboard')}>Dashboard</button>
            {currentUser.role === 'admin' && <span className="text-brand-200">Administrator workspace</span>}
          </nav>
        )}

        {currentUser && (
          <div className="flex items-center gap-2">
          <div className="relative order-2">
            <button
              onClick={() => setIsUserMenuOpen((open) => !open)}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
              aria-label="Account menu"
              className="flex items-center gap-2.5 rounded-xl border border-white/20 p-1.5 pr-3 text-left transition hover:bg-white/10"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-xs font-bold text-white">
                {currentUser.fullName.split(' ').map((name) => name[0]).slice(0, 2).join('')}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-white">{currentUser.fullName}</div>
                <span className={`mt-0.5 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${roleClass}`}>
                  {roleIcon(currentUser.role)} {roleLabel}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-brand-100" />
            </button>

            {isUserMenuOpen && (
              <>
                <button aria-label="Close user menu" className="fixed inset-0 z-40 h-full w-full cursor-default" onClick={() => setIsUserMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 text-xs shadow-xl">
                  <div className="mb-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="font-bold text-slate-800">{currentUser.fullName}</p>
                    <p className="truncate text-slate-500">{currentUser.username}</p>
                  </div>
                  <button onClick={() => { setShowSettings(true); setIsUserMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 font-medium text-slate-700 hover:bg-slate-100"><Settings className="h-3.5 w-3.5" /> My account</button>
                  <button
                    onClick={() => { setShowLogoutConfirm(true); setIsUserMenuOpen(false); }}
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
          {isFaculty && (
            <div className={`relative order-1 flex items-center justify-end transition-[width] duration-200 ${isStudentSearchOpen ? 'w-64 sm:w-72' : 'w-24'}`}>
              <button
                type="button"
                onClick={isStudentSearchOpen ? closeStudentSearch : openStudentSearch}
                aria-label={isStudentSearchOpen ? 'Close student search' : 'Search students'}
                aria-expanded={isStudentSearchOpen}
                className="z-10 flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-2 text-brand-100 transition hover:bg-white/10 hover:text-white"
              >
                {isStudentSearchOpen ? <X className="h-4 w-4" /> : <><span className="text-xs font-semibold">Search</span><Search className="h-4 w-4" /></>}
              </button>
              {isStudentSearchOpen && (
                <>
                  <input
                    ref={studentSearchInput}
                    value={studentSearchQuery}
                    onChange={(event) => setStudentSearchQuery(event.target.value)}
                    onFocus={() => { if (studentSearchQuery.trim()) setSuggestionsOpen(true); }}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        closeStudentSearch();
                      } else if (event.key === 'ArrowDown' && studentSuggestions.length) {
                        event.preventDefault();
                        setSuggestionsOpen(true);
                        setActiveSuggestionIndex((index) => Math.min(index + 1, studentSuggestions.length - 1));
                      } else if (event.key === 'ArrowUp' && studentSuggestions.length) {
                        event.preventDefault();
                        setActiveSuggestionIndex((index) => Math.max(index - 1, 0));
                      } else if (event.key === 'Enter' && suggestionsOpen) {
                        const selectedIndex = activeSuggestionIndex >= 0
                          ? activeSuggestionIndex
                          : studentSuggestions.length === 1 ? 0 : -1;
                        if (selectedIndex >= 0) {
                          event.preventDefault();
                          selectStudent(studentSuggestions[selectedIndex]);
                        }
                      }
                    }}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={suggestionsOpen}
                    aria-controls="navbar-student-suggestions"
                    aria-activedescendant={activeSuggestionIndex >= 0 ? `navbar-student-${activeSuggestionIndex}` : undefined}
                    placeholder="Search students..."
                    className="absolute inset-y-0 right-0 w-full rounded-lg border border-white/25 bg-white/10 px-3 pr-10 text-sm text-white outline-none placeholder:text-brand-200 focus:border-brand-300 focus:bg-white/15 focus:ring-2 focus:ring-brand-300/40"
                  />
                  {suggestionsOpen && (
                    <ul id="navbar-student-suggestions" role="listbox" className="absolute right-0 top-full z-50 mt-2 max-h-72 w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 text-left text-xs shadow-xl">
                      {suggestionsLoading && <li className="px-3 py-2 text-slate-500">Searching students…</li>}
                      {!suggestionsLoading && suggestionsError && <li role="alert" className="px-3 py-2 text-rose-600">{suggestionsError}</li>}
                      {!suggestionsLoading && !suggestionsError && studentSuggestions.length === 0 && <li className="px-3 py-2 text-slate-500">No matching students.</li>}
                      {studentSuggestions.map((student, index) => (
                        <li key={student.institutionId} id={`navbar-student-${index}`} role="option" aria-selected={activeSuggestionIndex === index}>
                          <button
                            type="button"
                            onMouseEnter={() => setActiveSuggestionIndex(index)}
                            onClick={() => selectStudent(student)}
                            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left ${activeSuggestionIndex === index ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
                          >
                            <span className="flex min-w-0 items-center gap-2.5">
                              <StudentProfilePhoto
                                institutionId={student.institutionId}
                                studentName={`${student.firstName} ${student.lastName}`}
                                className="h-9 w-9 shrink-0 rounded-full object-cover"
                              />
                              <span className="min-w-0">
                                <span className="block truncate font-semibold text-slate-800">{student.firstName} {student.lastName}</span>
                                <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-500">{student.institutionId}</span>
                              </span>
                            </span>
                            <span className="shrink-0 text-[10px] text-slate-500">@{student.username}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
          </div>
        )}
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="reset-demo-title" className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <h4 id="reset-demo-title" className="mb-2 font-bold text-slate-900">Reset local demo data?</h4>
            <p className="mb-6 text-xs text-slate-500">This does not change records in the backend.</p>
            <div className="flex justify-center gap-3">
              <button autoFocus onClick={() => setShowResetConfirm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold">Cancel</button>
              <button onClick={() => { resetAllData(); setShowResetConfirm(false); }} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white">Reset</button>
            </div>
          </div>
        </div>
      )}
      <Modal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Log out of SAPES?"
        subtitle="You’ll need to sign in again to access your account."
        maxWidth="sm"
        actions={(
          <>
            <button type="button" onClick={() => setShowLogoutConfirm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
              Cancel
            </button>
            <button type="button" onClick={() => { setShowLogoutConfirm(false); void logout(); }} className="rounded-lg bg-accent-500 px-4 py-2 text-xs font-semibold text-white hover:bg-accent-700">
              Log out
            </button>
          </>
        )}
      >
        <p className="text-sm leading-6 text-slate-600">Are you sure you want to log out?</p>
      </Modal>
      {showSettings && currentUser && (
        <UserSettingsModal
          username={currentUser.username || currentUser.studentNumber || currentUser.email || ''}
          role={currentUser.role}
          onClose={() => setShowSettings(false)}
        />
      )}
    </header>
  );
};
