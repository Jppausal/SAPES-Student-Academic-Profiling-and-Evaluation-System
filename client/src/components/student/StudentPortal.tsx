import React, { useEffect, useState } from 'react';
import { BookOpen, Contact, GraduationCap, User } from 'lucide-react';
import {
  fetchMyStudentIdentity,
  fetchMyStudentReport,
  StudentIdentity,
  StudentReport,
} from '../../lib/api';
import { BackendStudentWorkspace } from './BackendStudentWorkspace';
import { StudentProfileSetup } from './StudentProfileSetup';
import './student-workspace.css';

export const StudentPortal: React.FC = () => {
  const [identity, setIdentity] = useState<StudentIdentity | null>(null);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [reportError, setReportError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'profile'>('overview');
  const [savedMessage, setSavedMessage] = useState('');

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
        <div className="student-identity-info">
          <h1 className="student-name">{name || 'Alex Rivera'}</h1>
          <p className="student-subdetail">{program} • {yearLevel}</p>
        </div>
        <div className="student-institution-card">
          <div className="student-institution-icon-tile">
            <Contact className="w-5 h-5 text-blue-600" />
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
          onClick={() => setActiveTab('overview')}
          aria-current={activeTab === 'overview' ? 'page' : undefined}
          className={activeTab === 'overview' ? 'active' : ''}
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

      {activeTab === 'overview' && (report
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
            setActiveTab('overview');
          }}
        />
      )}
    </div>
  );
};
