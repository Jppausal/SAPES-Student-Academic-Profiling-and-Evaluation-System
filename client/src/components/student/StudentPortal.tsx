import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Contact, LayoutDashboard, User } from 'lucide-react';
import {
  fetchMyStudentIdentity,
  fetchMyStudentReport,
  StudentIdentity,
  StudentReport,
} from '../../lib/api';
import { StudentProfilePhoto } from '../common/StudentProfilePhoto';
import { BackendStudentWorkspace } from './BackendStudentWorkspace';
import { StudentDashboard } from './StudentDashboard';
import { StudentProfileSetup } from './StudentProfileSetup';
import './student-workspace.css';

export const StudentPortal: React.FC = () => {
  const [identity, setIdentity] = useState<StudentIdentity | null>(null);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [reportError, setReportError] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records' | 'profile'>('dashboard');
  const [savedMessage, setSavedMessage] = useState('');
  const previousTab = useRef(activeTab);

  useEffect(() => {
    let active = true;
    fetchMyStudentIdentity()
      .then((student) => {
        if (!active) return;
        setIdentity(student);
        const firstName = student.personalInformation?.firstName?.trim();
        const lastName = student.personalInformation?.lastName?.trim();
        if (!firstName || !lastName || (firstName === 'New' && lastName === 'Student')) {
          setActiveTab('profile');
        }
      })
      .catch((requestError) => {
        if (active) setProfileError(requestError instanceof Error ? requestError.message : 'Unable to load your student profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    fetchMyStudentReport()
      .then((studentReport) => {
        if (active) setReport(studentReport);
      })
      .catch((requestError) => {
        if (active) setReportError(requestError instanceof Error ? requestError.message : 'Unable to load academic records.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const returnedToOverview = previousTab.current === 'profile' && activeTab === 'dashboard';
    previousTab.current = activeTab;
    if (activeTab !== 'dashboard') return;

    let active = true;
    let refreshing = false;
    const refreshWorkspace = async () => {
      if (document.visibilityState !== 'visible' || refreshing) return;
      refreshing = true;
      try {
        const [identityResult, reportResult] = await Promise.allSettled([
          fetchMyStudentIdentity(),
          fetchMyStudentReport(),
        ]);
        if (!active) return;

        if (identityResult.status === 'fulfilled') {
          setIdentity(identityResult.value);
          setProfileError('');
        } else {
          setProfileError(identityResult.reason instanceof Error ? identityResult.reason.message : 'Unable to refresh your student profile.');
        }

        if (reportResult.status === 'fulfilled') {
          setReport(reportResult.value);
          setReportError('');
        } else {
          setReportError(reportResult.reason instanceof Error ? reportResult.reason.message : 'Unable to refresh academic records.');
        }
      } finally {
        refreshing = false;
      }
    };

    if (returnedToOverview) void refreshWorkspace();
    window.addEventListener('focus', refreshWorkspace);
    document.addEventListener('visibilitychange', refreshWorkspace);
    return () => {
      active = false;
      window.removeEventListener('focus', refreshWorkspace);
      document.removeEventListener('visibilitychange', refreshWorkspace);
    };
  }, [activeTab]);

  if (loading) {
    return (
      <div className="student-workspace">
        <div role="status" className="student-notice">Loading your student workspace...</div>
      </div>
    );
  }

  if (profileError || !identity) {
    return (
      <div className="student-workspace">
        <div role="alert" className="student-notice student-notice-error">{profileError || 'Student profile not found.'}</div>
      </div>
    );
  }

  const profileComplete = Boolean(
    identity.personalInformation?.firstName?.trim() &&
    identity.personalInformation?.lastName?.trim() &&
    !(identity.personalInformation.firstName === 'New' && identity.personalInformation.lastName === 'Student')
  );

  const name = [identity.personalInformation?.firstName, identity.personalInformation?.middleName, identity.personalInformation?.lastName].filter(Boolean).join(' ');
  const program = identity.enrollmentInformation?.course || identity.classification?.program || 'Bachelor of Science in Information Technology';
  const yearLevel = identity.enrollmentInformation?.yearLevel || '2nd Year';

  return (
    <div className="student-workspace">
      <header className="student-identity">
        <div className="flex min-w-0 items-center gap-4">
          <StudentProfilePhoto
            institutionId={identity.institutionId}
            studentName={name || 'Student'}
            className="h-16 w-16 shrink-0 rounded-full border-2 border-white object-cover shadow-sm"
          />
          <div className="student-identity-info min-w-0">
            <h1 className="student-name">{name || 'Alex Rivera'}</h1>
            <p className="student-subdetail">{program} • {yearLevel}</p>
          </div>
        </div>
        <div className="student-institution-card">
          <div className="student-institution-icon-tile">
            <Contact className="w-5 h-5 text-brand-600" />
          </div>
          <div className="student-institution-meta">
            <span className="student-institution-label">Institution ID</span>
            <span className="student-institution-id">{identity.institutionId || 'TEST-BSIT-0001'}</span>
          </div>
        </div>
      </header>

      <nav className="student-navigation" aria-label="Student workspace">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          aria-current={activeTab === 'dashboard' ? 'page' : undefined}
          className={activeTab === 'dashboard' ? 'active' : ''}
        >
          <LayoutDashboard className="student-tab-icon" />
          <span>Dashboard</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('records')}
          aria-current={activeTab === 'records' ? 'page' : undefined}
          className={activeTab === 'records' ? 'active' : ''}
        >
          <BookOpen className="student-tab-icon" />
          <span>Academic records</span>
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('profile'); setSavedMessage(''); }}
          aria-current={activeTab === 'profile' ? 'page' : undefined}
          className={activeTab === 'profile' ? 'active' : ''}
        >
          <User className="student-tab-icon" />
          <span>Personal profile</span>
          {!profileComplete && <span className="student-incomplete">Incomplete</span>}
        </button>
      </nav>

      {savedMessage && <p role="status" className="student-notice student-notice-success">{savedMessage}</p>}

      {activeTab === 'dashboard' && (
        <StudentDashboard
          identity={identity}
          report={report}
          reportError={reportError}
          onViewRecords={() => setActiveTab('records')}
          onEditProfile={() => setActiveTab('profile')}
        />
      )}

      {activeTab === 'records' && (report
        ? <BackendStudentWorkspace identity={identity} report={report} />
        : <div role={reportError ? 'alert' : 'status'} className="student-notice">{reportError || 'Academic records are still loading.'} You can still edit your personal profile.</div>
      )}

      {activeTab === 'profile' && (
        <StudentProfileSetup
          identity={identity}
          isOnboarding={!profileComplete}
          onSaved={(updatedIdentity) => {
            setIdentity(updatedIdentity);
            setSavedMessage('Your student profile was saved successfully.');
            setActiveTab('dashboard');
          }}
        />
      )}
    </div>
  );
};
