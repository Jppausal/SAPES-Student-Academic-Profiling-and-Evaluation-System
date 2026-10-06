import React, { useEffect, useState } from 'react';
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
    return <div className="student-workspace"><div role="status" className="student-notice">Loading your student profile...</div></div>;
  }

  if (profileError || !identity) {
    return <div className="student-workspace"><div role="alert" className="student-notice student-notice-error">{profileError || 'Student profile not found.'}</div></div>;
  }

  const profileComplete = Boolean(
    identity.personalInformation?.firstName?.trim() &&
    identity.personalInformation?.lastName?.trim() &&
    !(identity.personalInformation.firstName === 'New' && identity.personalInformation.lastName === 'Student')
  );

  const name = [identity.personalInformation?.firstName, identity.personalInformation?.middleName, identity.personalInformation?.lastName].filter(Boolean).join(' ');

  return (
    <div className="student-workspace">
      <header className="student-identity">
        <div>
          <p className="student-context">Student workspace</p>
          <h1>{name || 'Student profile'}</h1>
          <p>{identity.enrollmentInformation?.course || identity.classification?.program || 'Program not recorded'}</p>
        </div>
        <dl className="student-identity-details">
          <div><dt>Institution ID</dt><dd>{identity.institutionId}</dd></div>
        </dl>
      </header>
      <nav className="student-navigation" aria-label="Student workspace">
        <button type="button" onClick={() => setActiveTab('overview')} aria-current={activeTab === 'overview' ? 'page' : undefined}>
          Academic records
        </button>
        <button type="button" onClick={() => { setActiveTab('profile'); setSavedMessage(''); }} aria-current={activeTab === 'profile' ? 'page' : undefined}>
          Personal profile
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
