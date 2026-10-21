import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  BookOpen,
  Contact,
  FileText,
  GraduationCap,
  ShieldCheck,
  Sliders,
  User,
  X,
} from 'lucide-react';
import {
  formatPortalDate,
  useStudentNotificationPreferences,
  useStudentPreferences,
} from '../../hooks/useStudentPreferences';
import {
  fetchMyStudentIdentity,
  fetchMyStudentReport,
  StudentIdentity,
  StudentReport,
} from '../../lib/api';
import { StudentProfilePhoto } from '../common/StudentProfilePhoto';
import { UserSettingsModal } from '../layout/UserSettingsModal';
import { BackendStudentWorkspace } from './BackendStudentWorkspace';
import { StudentProfileSetup } from './StudentProfileSetup';
import './student-workspace.css';

const statusLabel = (status?: string) => typeof status === 'string' && status.trim()
  ? status.trim().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  : 'Not recorded';

export const StudentPortal: React.FC = () => {
  const [identity, setIdentity] = useState<StudentIdentity | null>(null);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [reportError, setReportError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'profile'>('overview');
  const [savedMessage, setSavedMessage] = useState('');
  const previousTab = useRef(activeTab);

  // Portal preferences & notifications
  const { dateFormat } = useStudentPreferences();
  const notifications = useStudentNotificationPreferences();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'overview' | 'security' | 'notifications' | 'preferences'>('preferences');
  const [dismissedBanners, setDismissedBanners] = useState<Record<string, boolean>>({});

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
    const returnedToOverview = previousTab.current === 'profile' && activeTab === 'overview';
    previousTab.current = activeTab;
    if (activeTab !== 'overview') return;

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

  const missingEmergencyOrContact = Boolean(
    !identity.healthInformation?.emergencyContactName?.trim() ||
    !identity.contactInformation?.mobileNumber?.trim()
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="student-institution-card">
            <div className="student-institution-icon-tile">
              <Contact className="w-5 h-5 text-brand-600" />
            </div>
            <div className="student-institution-meta">
              <span className="student-institution-label">Institution ID</span>
              <span className="student-institution-id">{identity.institutionId || 'TEST-BSIT-0001'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSettingsInitialTab('preferences');
              setShowSettingsModal(true);
            }}
            className="student-header-action-btn"
            title="Configure compact records view, GWA privacy shield, and date format"
          >
            <Sliders className="h-4 w-4 text-brand-600" />
            <span>Portal Preferences</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSettingsInitialTab('notifications');
              setShowSettingsModal(true);
            }}
            className="student-header-action-btn"
            title="Configure academic alerts, profiling reminders, and security alerts"
          >
            <Bell className="h-4 w-4 text-amber-600" />
            <span>Notifications</span>
          </button>
        </div>
      </header>

      {/* STUDENT NOTIFICATIONS & ALERTS DECK */}
      <div className="student-notifications-deck">
        {/* 1. Academic & Evaluation Notifications */}
        {notifications.profileAndAcademicUpdates && !dismissedBanners.academic && (
          <div className="student-notification-banner student-banner-academic" role="status">
            <div className="student-banner-left">
              <div className="student-banner-icon-box">
                {identity.academicStatus?.isOnProbation ? (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                ) : (
                  <GraduationCap className="w-4 h-4 text-brand-600" />
                )}
              </div>
              <div>
                <h4 className="student-banner-title">
                  {identity.academicStatus?.isOnProbation
                    ? 'Academic Standing Notice: Recorded Probation'
                    : report?.facultyEvaluation?.evaluationStatus
                      ? `Academic Evaluation: ${statusLabel(report.facultyEvaluation.evaluationStatus)}`
                      : 'Academic & Evaluation Notifications Active'}
                </h4>
                <p className="student-banner-desc">
                  {identity.academicStatus?.isOnProbation
                    ? (identity.academicStatus.probationReason || 'Your record reflects an at-risk academic standing. Please consult your academic adviser for guidance.')
                    : report?.facultyEvaluation?.evaluationStatus
                      ? `Faculty evaluation recorded on ${formatPortalDate(report.facultyEvaluation.evaluatedAt, dateFormat)}. View remarks in the evaluation panel.`
                      : 'You are subscribed to alerts when grades are finalized, evaluation periods open, or standing updates.'}
                </p>
              </div>
            </div>
            <div className="student-banner-actions">
              <button
                type="button"
                onClick={() => setDismissedBanners((prev) => ({ ...prev, academic: true }))}
                className="student-banner-dismiss"
                aria-label="Dismiss academic notification"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 2. Profile & Document Reminders */}
        {notifications.emailAlerts && !dismissedBanners.profile && (
          <div className="student-notification-banner student-banner-profile" role="status">
            <div className="student-banner-left">
              <div className="student-banner-icon-box">
                <FileText className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h4 className="student-banner-title">
                  {!profileComplete || missingEmergencyOrContact
                    ? 'Profile & Document Reminder: Review Your Profiling Details'
                    : 'Profile & Document Reminders Active'}
                </h4>
                <p className="student-banner-desc">
                  {!profileComplete || missingEmergencyOrContact
                    ? 'Please review your profiling information, religious observances, emergency contacts, and contact numbers to keep institutional records current.'
                    : 'Your contact numbers, emergency details, and profiling records are verified for this academic period.'}
                </p>
              </div>
            </div>
            <div className="student-banner-actions">
              {(!profileComplete || missingEmergencyOrContact) && (
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="student-banner-btn student-banner-btn-primary"
                >
                  Review Profile
                </button>
              )}
              <button
                type="button"
                onClick={() => setDismissedBanners((prev) => ({ ...prev, profile: true }))}
                className="student-banner-dismiss"
                aria-label="Dismiss profile reminder"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 3. Security & Account Alerts */}
        {notifications.securityAlerts && !dismissedBanners.security && (
          <div className="student-notification-banner student-banner-security" role="status">
            <div className="student-banner-left">
              <div className="student-banner-icon-box">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h4 className="student-banner-title">Security &amp; Account Protection Active</h4>
                <p className="student-banner-desc">
                  Session authenticated via BukSU institutional credentials. Password updates, new sign-ins, and critical security announcements are monitored.
                </p>
              </div>
            </div>
            <div className="student-banner-actions">
              <button
                type="button"
                onClick={() => {
                  setSettingsInitialTab('security');
                  setShowSettingsModal(true);
                }}
                className="student-banner-btn student-banner-btn-outline"
              >
                Security Settings
              </button>
              <button
                type="button"
                onClick={() => setDismissedBanners((prev) => ({ ...prev, security: true }))}
                className="student-banner-dismiss"
                aria-label="Dismiss security alert"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

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

      {showSettingsModal && (
        <UserSettingsModal
          username={identity.institutionId || identity.personalInformation?.firstName || 'Student'}
          role="student"
          initialTab={settingsInitialTab}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
};
