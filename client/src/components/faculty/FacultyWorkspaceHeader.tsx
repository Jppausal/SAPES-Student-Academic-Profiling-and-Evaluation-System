import React from 'react';
import { BadgeCheck, BookOpen, Contact, ClipboardCheck, LayoutDashboard } from 'lucide-react';
import type { FacultyPage } from '../../types';
import { useApp } from '../../context/AppContext';
import '../student/student-workspace.css';

interface FacultyWorkspaceHeaderProps {
  activePage: FacultyPage;
  onNavigate: (page: FacultyPage) => void;
}

const tabs: Array<{ page: FacultyPage; label: string; icon: typeof LayoutDashboard }> = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'evaluations', label: 'Evaluations', icon: ClipboardCheck },
  { page: 'student-records', label: 'Academic records', icon: BookOpen },
];

export const FacultyWorkspaceHeader: React.FC<FacultyWorkspaceHeaderProps> = ({ activePage, onNavigate }) => {
  const { currentUser } = useApp();
  if (!currentUser) return null;

  const facultyId = currentUser.facultyId || currentUser.employeeId;

  return (
    <div className="student-workspace">
      <header className="student-identity">
        <div className="student-identity-info">
          <h1 className="student-name">{currentUser.fullName || currentUser.username}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <BadgeCheck aria-hidden="true" className="h-4 w-4" />
            {currentUser.designation || 'Verified enrollment officer'}
          </p>
          <p className="student-subdetail">Welcome to the faculty workspace</p>
        </div>
        <div className="student-institution-card">
          <div className="student-institution-icon-tile">
            <Contact className="h-5 w-5 text-blue-600" />
          </div>
          <div className="student-institution-meta">
            <span className="student-institution-label">{facultyId ? 'Faculty ID' : 'Username'}</span>
            <span className="student-institution-id">{facultyId || currentUser.username}</span>
          </div>
        </div>
      </header>

      <nav className="student-navigation" aria-label="Faculty workspace">
        {tabs.map(({ page, label, icon: Icon }) => (
          <button
            key={page}
            type="button"
            onClick={() => onNavigate(page)}
            aria-current={activePage === page ? 'page' : undefined}
            className={activePage === page ? 'active' : ''}
          >
            <Icon className="student-tab-icon" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
