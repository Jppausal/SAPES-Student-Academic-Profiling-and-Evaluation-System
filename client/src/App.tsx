/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { StudentPortal } from './components/student/StudentPortal';
import { StudentSearchPage } from './components/faculty/StudentSearchPage';
import { FacultyAcademicRecordsPage } from './components/faculty/FacultyAcademicRecordsPage';
import { FacultyEvaluationPage } from './components/faculty/FacultyEvaluationPage';
import { FacultyDashboardPage } from './components/faculty/FacultyDashboardPage';
import { DepartmentEnrollmentDashboard } from './components/faculty/DepartmentEnrollmentDashboard';
import { FacultyWorkspaceHeader } from './components/faculty/FacultyWorkspaceHeader';
import { AdminPortal } from './components/admin/AdminPortal';
import { AuthLandingPage } from './pages/auth/AuthLandingPage';
import LoginPage from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { EvaluationTarget, FacultyPage } from './types';
import { DEPARTMENT_PROGRAMS } from './lib/academicPrograms';

type AuthView = 'landing' | 'login' | 'forgot-password' | 'dashboard';

const UI_SESSION_KEYS = {
  AUTH_VIEW: 'sapes_auth_view_v1',
  ACTIVE_PAGE: 'sapes_active_page_v1',
} as const;

const isAuthView = (value: string | null): value is AuthView =>
  value === 'landing' || value === 'login' || value === 'forgot-password' || value === 'dashboard';

const isFacultyPage = (value: string | null): value is FacultyPage =>
  value === 'dashboard' || value === 'student-search' || value === 'evaluations' || value === 'student-records';

const AppContent: React.FC = () => {
  const { currentUser, sessionReady, login, loginWithGoogle } = useApp();
  const [authView, setAuthView] = useState<AuthView>(() => {
    const savedView = sessionStorage.getItem(UI_SESSION_KEYS.AUTH_VIEW);
    return currentUser ? 'dashboard' : (isAuthView(savedView) ? savedView : 'landing');
  });
  const [activePage, setActivePage] = useState<FacultyPage>(() => {
    const savedPage = sessionStorage.getItem(UI_SESSION_KEYS.ACTIVE_PAGE);
    return isFacultyPage(savedPage) ? savedPage : 'dashboard';
  });

  useEffect(() => {
    sessionStorage.setItem(UI_SESSION_KEYS.AUTH_VIEW, authView);
  }, [authView]);

  useEffect(() => {
    sessionStorage.setItem(UI_SESSION_KEYS.ACTIVE_PAGE, activePage);
  }, [activePage]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [evaluationTarget, setEvaluationTarget] = useState<EvaluationTarget | null>(null);

  useEffect(() => {
    if (!sessionReady) return;
    if (currentUser) {
      setAuthView('dashboard');
    } else if (authView === 'dashboard') {
      setAuthView('landing');
    }
  }, [authView, currentUser, sessionReady]);

  if (!sessionReady) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm font-medium text-slate-500">Validating your session…</div>;
  }

  if (authView === 'login') {
    return (
      <LoginPage
        onLogin={async (username, password, recaptchaToken) => {
          const result = await login(username, password, recaptchaToken);
          if (result.success) setAuthView('dashboard');
          return result;
        }}
        onGoogleLogin={async (credential) => {
          const result = await loginWithGoogle(credential);
          if (result.success) setAuthView('dashboard');
          return result;
        }}
        onBack={() => setAuthView('landing')}
        onForgotPassword={() => setAuthView('forgot-password')}
      />
    );
  }

  if (authView === 'forgot-password') {
    return <ForgotPasswordPage onBack={() => setAuthView('login')} />;
  }

  if (authView === 'landing') {
    return <AuthLandingPage onLogin={() => setAuthView('login')} />;
  }

  if (!currentUser) {
    return <AuthLandingPage onLogin={() => setAuthView('login')} />;
  }

  const navigateFacultyPage = (page: FacultyPage) => {
    setEvaluationTarget(null);
    setActivePage(page);
  };
  const departmentProgram = currentUser?.isVerifiedEnrollmentOfficer && currentUser.departmentCode
    ? DEPARTMENT_PROGRAMS[currentUser.departmentCode]
    : undefined;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-brand-600 selection:text-white">
      <Navbar
        activePage={activePage}
        onNavigate={navigateFacultyPage}
        onStudentSearch={(query) => {
          setStudentSearchQuery(query);
          setActivePage('student-search');
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentUser?.role === 'student' && <StudentPortal />}
        {currentUser?.role === 'faculty' && (
          <>
            <FacultyWorkspaceHeader activePage={activePage} onNavigate={navigateFacultyPage} />
            {activePage === 'student-search' ? <StudentSearchPage initialQuery={studentSearchQuery} />
              : activePage === 'student-records' ? <FacultyAcademicRecordsPage fixedProgram={departmentProgram} canApproveEnrollment={currentUser.isVerifiedEnrollmentOfficer} />
                : activePage === 'evaluations' ? <FacultyEvaluationPage initialTarget={evaluationTarget} fixedProgram={departmentProgram} />
                  : (
                    currentUser.isVerifiedEnrollmentOfficer
                      ? <DepartmentEnrollmentDashboard
                          facultyName={currentUser.fullName}
                          onNavigate={navigateFacultyPage}
                        />
                      : <FacultyDashboardPage
                          facultyName={currentUser.fullName}
                          onNavigate={navigateFacultyPage}
                          onOpenEvaluation={(target) => {
                            setEvaluationTarget(target);
                            setActivePage('evaluations');
                          }}
                        />
                  )}
          </>
        )}
        {currentUser?.role === 'admin' && <AdminPortal />}
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white py-5">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-1 px-4 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <span>© 2026 Bukidnon State University · SAPES</span>
          <span>Student Enrollment & Academic Status Management System</span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
