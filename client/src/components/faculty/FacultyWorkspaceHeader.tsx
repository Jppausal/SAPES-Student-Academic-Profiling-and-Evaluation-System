import React from 'react';
import { BookOpen, ClipboardCheck, LayoutDashboard } from 'lucide-react';
import type { FacultyPage } from '../../types';
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

export const FacultyWorkspaceHeader: React.FC<FacultyWorkspaceHeaderProps> = ({ activePage, onNavigate }) => (
  <div className="student-workspace">
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
