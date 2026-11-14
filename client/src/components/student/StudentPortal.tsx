import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  FileText,
  GraduationCap,
  ShieldCheck,
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
import { UserSettingsModal } from '../layout/UserSettingsModal';
import { BackendStudentWorkspace } from './BackendStudentWorkspace';
import { StudentDashboard } from './StudentDashboard';
import { StudentProfileSetup } from './StudentProfileSetup';
import { StudentAuditLogs } from './StudentAuditLogs';
import './student-workspace.css';

type StudentTab = 'dashboard' | 'records' | 'profile' | 'audit';

interface StudentPortalProps {
  activeTab: StudentTab;
  onActiveTabChange: (tab: StudentTab) => void;
  notificationsOpen: boolean;
  onNotificationsOpenChange: (open: boolean) => void;
}

const statusLabel = (status?: string) => typeof status === 'string' && status.trim()
  ? status.trim().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  : 'Not recorded';

export const StudentPortal: React.FC<StudentPortalProps> = ({
  activeTab,
  onActiveTabChange,
  notificationsOpen,
  onNotificationsOpenChange,
}) => {
  const [identity, setIdentity] = useState<StudentIdentity | null>(null);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [reportError, setReportError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const previousTab = useRef(activeTab);

  // Portal preferences & notifications
  const { dateFormat } = useStudentPreferences();
  const notifications = useStudentNotificationPreferences();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'overview' | 'security' | 'notifications' | 'preferences'>('preferences');
  const [dismissedBanners, setDismissedBanners] = useState<Record<string, boolean>>({});
  const [readNotifications, setReadNotifications] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!notificationsOpen) return;

    const activeNotificationIds = [
      notifications.profileAndAcademicUpdates && !dismissedBanners.academic ? 'academic' : '',
      notifications.emailAlerts && !dismissedBanners.profile ? 'profile' : '',
      notifications.securityAlerts && !dismissedBanners.security ? 'security' : '',
    ].filter(Boolean);

    if (activeNotificationIds.length > 0) {
      setReadNotifications((previous) => ({
        ...previous,
        ...Object.fromEntries(activeNotificationIds.map((id) => [id, true])),
      }));
    }
  }, [
    notificationsOpen,
    notifications.profileAndAcademicUpdates,
    notifications.emailAlerts,
    notifications.securityAlerts,
    dismissedBanners.academic,
    dismissedBanners.profile,
    dismissedBanners.security,
  ]);

  useEffect(() => {
    let active = true;
    fetchMyStudentIdentity()
      .then((student) => {
        if (!active) return;
        setIdentity(student);
        const firstName = student.personalInformation?.firstName?.trim();
        const lastName = student.personalInformation?.lastName?.trim();
        if (!firstName || !lastName || (firstName === 'New' && lastName === 'Student')) {
          onActiveTabChange('profile');
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

  const missingEmergencyOrContact = Boolean(
    !identity.healthInformation?.emergencyContactName?.trim() ||
    !identity.contactInformation?.mobileNumber?.trim()
  );
  const activeNotificationIds = [
    notifications.profileAndAcademicUpdates && !dismissedBanners.academic ? 'academic' : '',
    notifications.emailAlerts && !dismissedBanners.profile ? 'profile' : '',
    notifications.securityAlerts && !dismissedBanners.security ? 'security' : '',
  ].filter(Boolean);

  return (
    <div className="student-workspace">
      <div className="student-navigation-shell">
      {/* STUDENT NOTIFICATIONS & ALERTS POPOVER */}
      {notificationsOpen && (
        <div id="student-notifications-popover" className="student-notifications-popover" role="region" aria-label="Notifications">
          <div className="student-notifications-popover-header">
            <div>
              <h2>Notifications</h2>
              <p>Updates about your profile, academics, and account.</p>
            </div>
            <button
              type="button"
              onClick={() => onNotificationsOpenChange(false)}
              className="student-notifications-close"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

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
                      onClick={() => onActiveTabChange('profile')}
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
                      onNotificationsOpenChange(false);
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
            {activeNotificationIds.length === 0 && (
              <p className="student-notifications-empty">You're all caught up.</p>
            )}
          </div>
          <button
            type="button"
            className="student-notifications-settings"
            onClick={() => {
              setSettingsInitialTab('notifications');
              setShowSettingsModal(true);
              onNotificationsOpenChange(false);
            }}
          >
            Manage notification settings
          </button>
        </div>
      )}

      </div>

      {savedMessage && <p role="status" className="student-notice student-notice-success">{savedMessage}</p>}

      {activeTab === 'dashboard' && (
        <StudentDashboard
          identity={identity}
          report={report}
          reportError={reportError}
          onViewRecords={() => onActiveTabChange('records')}
          onEditProfile={() => onActiveTabChange('profile')}
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
            onActiveTabChange('dashboard');
          }}
        />
      )}

      {activeTab === 'audit' && <StudentAuditLogs />}

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
