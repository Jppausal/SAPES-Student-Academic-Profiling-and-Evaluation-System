/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { StudentPortal } from './components/student/StudentPortal';
import { FacultyPortal } from './components/faculty/FacultyPortal';
import { AdminPortal } from './components/admin/AdminPortal';

const AppContent: React.FC = () => {
  const { currentUser, serverStatus } = useApp();

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar & Role Switcher */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentUser?.role === 'student' && <StudentPortal />}
        {currentUser?.role === 'faculty' && <FacultyPortal />}
        {currentUser?.role === 'admin' && <AdminPortal />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-emerald-500' : serverStatus === 'checking' ? 'bg-amber-400 animate-pulse' : 'bg-rose-500'}`}></span>
            <span>Student Enrollment & Academic Status Management System (SEASMS)</span>
          </div>
          <div>
            <span>API: </span>
            <strong className={`uppercase font-mono font-bold ${serverStatus === 'online' ? 'text-emerald-700' : serverStatus === 'checking' ? 'text-amber-700' : 'text-rose-700'}`}>
              {serverStatus}
            </strong>
            <span className="mx-2 text-slate-300">|</span>
            <span>Session Role: </span>
            <strong className="text-slate-800 uppercase font-mono font-bold">
              {currentUser?.role}
            </strong>
          </div>
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
