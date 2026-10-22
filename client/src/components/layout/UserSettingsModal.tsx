import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Sliders,
  User,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useEmailAvailability } from '../../hooks/useEmailAvailability';
import {
  formatPortalDate,
  useStudentPreferences
} from '../../hooks/useStudentPreferences';
import {
  changePassword,
  confirmPasswordReset,
  fetchMyStudentIdentity,
  fetchUserSettings,
  requestPasswordReset,
  saveUserSettings,
  StudentIdentity,
  UserNotificationPreferences,
  verifyPasswordReset
} from '../../lib/api';
import { UserRole } from '../../types';

interface UserSettingsModalProps {
  username: string;
  role: UserRole;
  onClose: () => void;
  initialTab?: TabType;
}

type TabType = 'overview' | 'security' | 'notifications' | 'preferences';

const ToggleSwitch: React.FC<{
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}> = ({ checked, disabled, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation();
      if (!disabled) onChange(!checked);
    }}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
      checked ? 'bg-brand-600' : 'bg-slate-300'
    } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ username, role, onClose, initialTab }) => {
  const { currentUser } = useApp();
  const emailAvailability = useEmailAvailability();
  const {
    compactGrades,
    gwaPrivacyShield,
    dateFormat,
    setCompactGrades,
    setGwaPrivacyShield,
    setDateFormat
  } = useStudentPreferences();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'overview');

  // Student specific identity details
  const [studentIdentity, setStudentIdentity] = useState<StudentIdentity | null>(null);
  const [loadingIdentity, setLoadingIdentity] = useState(false);

  // Password change state (In-session)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Forgot password fallback flow (Email code)
  const [showEmailResetFlow, setShowEmailResetFlow] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Notification preferences state
  const [notifications, setNotifications] = useState<UserNotificationPreferences>({
    profileAndAcademicUpdates: true,
    emailAlerts: true,
    securityAlerts: true
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  const [copiedId, setCopiedId] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Fetch settings & student details
  useEffect(() => {
    let active = true;
    fetchUserSettings()
      .then((settings) => {
        if (!active) return;
        setNotifications({
          profileAndAcademicUpdates: settings.notificationPreferences.profileAndAcademicUpdates ?? true,
          emailAlerts: settings.notificationPreferences.emailAlerts ?? true,
          securityAlerts: settings.notificationPreferences.securityAlerts ?? true
        });
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingSettings(false);
      });

    if (role === 'student') {
      setLoadingIdentity(true);
      fetchMyStudentIdentity()
        .then((data) => {
          if (active) setStudentIdentity(data);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoadingIdentity(false);
        });
    }

    return () => {
      active = false;
    };
  }, [role]);

  // Handle in-session standard password change
  const handleInSessionPasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    if (currentPassword && currentPassword === newPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    setPasswordLoading(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      setPasswordSuccess(result.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Unable to update password. Please check your current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle email code fallback password reset
  const handleEmailResetSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResetError('');
    setResetSuccess('');

    const accountIdentifier = (
      currentUser?.username ||
      currentUser?.studentNumber ||
      currentUser?.email ||
      studentIdentity?.institutionId ||
      username ||
      ''
    ).trim();

    if (!accountIdentifier) {
      setResetError('Unable to identify your student account. Please re-login.');
      return;
    }

    if (resetSent) {
      if (!resetCode.trim()) {
        setResetError('Please enter the 6-digit verification code.');
        return;
      }
      if (resetNewPassword.length < 8) {
        setResetError('New password must be at least 8 characters long.');
        return;
      }
      if (resetNewPassword !== resetConfirmPassword) {
        setResetError('New password and confirmation do not match.');
        return;
      }
    }

    setResetLoading(true);
    try {
      if (resetSent) {
        const verifyResult = await verifyPasswordReset(accountIdentifier, resetCode.trim());
        const result = await confirmPasswordReset(verifyResult.resetAuthorization, resetNewPassword);
        setResetSuccess(result.message || 'Password reset confirmed.');
        setResetSent(false);
        setResetCode('');
        setResetNewPassword('');
        setResetConfirmPassword('');
      } else {
        const result = await requestPasswordReset(accountIdentifier);
        setResetSuccess(result.message || 'A verification code has been sent to your registered institutional email.');
        setResetSent(true);
      }
    } catch (reason) {
      setResetError(reason instanceof Error ? reason.message : 'Unable to complete password reset.');
    } finally {
      setResetLoading(false);
    }
  };

  // Toggle notification preferences
  const updateNotificationPreference = async (key: keyof UserNotificationPreferences, nextValue: boolean) => {
    const updated = { ...notifications, [key]: nextValue };
    setNotifications(updated);
    try {
      localStorage.setItem('sapes_pref_notifications', JSON.stringify(updated));
    } catch {}
    setSettingsSaving(true);
    setSettingsMessage('');
    try {
      const res = await saveUserSettings(updated);
      if (res?.data?.notificationPreferences) {
        setNotifications(res.data.notificationPreferences);
        try {
          localStorage.setItem('sapes_pref_notifications', JSON.stringify(res.data.notificationPreferences));
        } catch {}
      }
      setSettingsMessage('Notification preferences updated successfully.');
      setTimeout(() => setSettingsMessage(''), 3000);
      window.dispatchEvent(new CustomEvent('sapes:notifications-changed', { detail: updated }));
    } catch (reason) {
      // Revert on failure
      setNotifications(notifications);
      try {
        localStorage.setItem('sapes_pref_notifications', JSON.stringify(notifications));
      } catch {}
      setSettingsMessage(reason instanceof Error ? reason.message : 'Failed to save preference.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const copyStudentId = () => {
    const idToCopy = studentIdentity?.institutionId || currentUser?.studentNumber || username;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(idToCopy);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const fullName =
    studentIdentity?.personalInformation
      ? `${studentIdentity.personalInformation.firstName || ''} ${studentIdentity.personalInformation.lastName || ''}`.trim()
      : currentUser?.fullName || username;

  const displayId = studentIdentity?.institutionId || currentUser?.studentNumber || username;
  const institutionalEmail = studentIdentity?.contactInformation?.institutionalEmail || currentUser?.email || `${username}@student.buksu.edu.ph`;
  const programCourse = studentIdentity?.enrollmentInformation?.course || currentUser?.department || 'College of Technologies';
  const sectionInfo = studentIdentity?.enrollmentInformation?.section ? `Section ${studentIdentity.enrollmentInformation.section}` : '';
  const yearLevelInfo = studentIdentity?.enrollmentInformation?.yearLevel ? `Year ${studentIdentity.enrollmentInformation.yearLevel}` : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm transition-all"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-settings-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm ring-4 ring-brand-50">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 id="user-settings-title" className="text-base font-bold text-slate-900">
                My Account &amp; Preferences
              </h2>
              <p className="text-xs text-slate-500">
                Manage your credentials, security settings, and student portal view options
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-600"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-white px-6">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition ${
              activeTab === 'overview'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Overview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition ${
              activeTab === 'security'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Security &amp; Password</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition ${
              activeTab === 'notifications'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            <span>Notifications</span>
          </button>
          {role === 'student' && (
            <button
              type="button"
              onClick={() => setActiveTab('preferences')}
              className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition ${
                activeTab === 'preferences'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Portal Preferences</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 text-sm text-slate-700">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Profile Card */}
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-brand-50/20 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-lg font-bold text-white shadow-md ring-4 ring-white">
                    {fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{fullName}</h3>
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-brand-800 uppercase">
                        {role}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{institutionalEmail}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-700">
                        ID: {displayId}
                      </span>
                      <button
                        type="button"
                        onClick={copyStudentId}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                        title="Copy student ID"
                      >
                        {copiedId ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy ID</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3 sm:text-right">
                  <span className="text-[11px] font-medium text-slate-400">Account Standing</span>
                  <div className="mt-0.5 flex items-center gap-1.5 sm:justify-end">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-800">
                      {studentIdentity?.academicStatus?.currentStatus || 'Active / Enrolled'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Authenticated via SAPES Core</span>
                </div>
              </div>

              {/* Academic Placement Details */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-brand-600" />
                  <h4 className="text-xs font-bold text-slate-900">Academic Placement</h4>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Program</span>
                    <p className="mt-0.5 text-xs font-semibold text-slate-800">{programCourse}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Classification</span>
                    <p className="mt-0.5 text-xs font-semibold text-slate-800">
                      {[yearLevelInfo, sectionInfo].filter(Boolean).join(' • ') || 'Undergraduate'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Google Authentication Status */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Institutional Single Sign-On</h4>
                    <p className="text-[11px] text-slate-500">
                      Your BukSU Google Workspace account is linked for single-click sign-in.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Linked
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY & PASSWORD */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              {/* Standard In-Session Password Change */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-brand-600" />
                  <h3 className="text-sm font-bold text-slate-900">Change Your Password</h3>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Update your password immediately. No email verification code is required while logged in.
                </p>

                {passwordSuccess && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {passwordError && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handleInSessionPasswordChange} className="mt-4 space-y-3.5">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-10 text-xs text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showCurrentPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          minLength={8}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-10 text-xs text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                          tabIndex={-1}
                        >
                          {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          minLength={8}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-10 text-xs text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                    <span className={`inline-flex items-center gap-1 ${newPassword.length >= 8 ? 'font-semibold text-emerald-600' : ''}`}>
                      <Check className={`h-3 w-3 ${newPassword.length >= 8 ? 'text-emerald-600' : 'text-slate-300'}`} />
                      At least 8 characters
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 ${
                        confirmNewPassword && newPassword === confirmNewPassword ? 'font-semibold text-emerald-600' : ''
                      }`}
                    >
                      <Check
                        className={`h-3 w-3 ${
                          confirmNewPassword && newPassword === confirmNewPassword ? 'text-emerald-600' : 'text-slate-300'
                        }`}
                      />
                      Passwords match
                    </span>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={passwordLoading || !newPassword || newPassword.length < 8 || newPassword !== confirmNewPassword}
                      className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {passwordLoading ? 'Updating Password…' : 'Save New Password'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Forgot Current Password (Email Recovery option) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <button
                  type="button"
                  onClick={() => setShowEmailResetFlow(!showEmailResetFlow)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Forgot your current password?</h4>
                    <p className="text-[11px] text-slate-500">
                      Request a 6-digit verification code to be sent to your institutional email.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-brand-600 hover:text-brand-800">
                    {showEmailResetFlow ? 'Hide' : 'Use Email Reset'}
                  </span>
                </button>

                {showEmailResetFlow && (
                  <div className="mt-4 border-t border-slate-200 pt-3">
                    <p role="status" className="mb-2 text-xs text-slate-600">
                      {emailAvailability.message}
                    </p>

                    {resetSuccess && (
                      <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{resetSuccess}</span>
                      </div>
                    )}
                    {resetError && (
                      <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                        <span>{resetError}</span>
                      </div>
                    )}

                    <form onSubmit={handleEmailResetSubmit} className="space-y-3">
                      {resetSent && (
                        <div className="space-y-2.5">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700">6-Digit Verification Code</label>
                            <input
                              required
                              value={resetCode}
                              onChange={(e) => setResetCode(e.target.value)}
                              placeholder="Enter 6-digit code from email"
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700">New Password</label>
                            <input
                              required
                              type="password"
                              minLength={8}
                              value={resetNewPassword}
                              onChange={(e) => setResetNewPassword(e.target.value)}
                              placeholder="New password (at least 8 chars)"
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700">Confirm New Password</label>
                            <input
                              required
                              type="password"
                              minLength={8}
                              value={resetConfirmPassword}
                              onChange={(e) => setResetConfirmPassword(e.target.value)}
                              placeholder="Confirm new password"
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={resetLoading || !emailAvailability.enabled}
                          className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {resetLoading ? 'Processing…' : resetSent ? 'Set New Password' : 'Send Code to Email'}
                        </button>
                        {resetSent && (
                          <button
                            type="button"
                            onClick={() => {
                              setResetSent(false);
                              setResetCode('');
                              setResetError('');
                            }}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            Resend Code
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              {/* Academic & Evaluation Notifications */}
              <div
                onClick={() => updateNotificationPreference('profileAndAcademicUpdates', !notifications.profileAndAcademicUpdates)}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
              >
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">Academic &amp; Evaluation Notifications</h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        notifications.profileAndAcademicUpdates
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {notifications.profileAndAcademicUpdates ? 'Active alerts' : 'Muted'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Receive alerts when faculty evaluations open, grades are posted, or academic standing is updated.
                  </p>
                </div>
                <ToggleSwitch
                  checked={notifications.profileAndAcademicUpdates}
                  disabled={loadingSettings || settingsSaving}
                  onChange={(checked) => updateNotificationPreference('profileAndAcademicUpdates', checked)}
                  label="Academic & Evaluation Notifications"
                />
              </div>

              {/* Profile & Document Reminders */}
              <div
                onClick={() => updateNotificationPreference('emailAlerts', !(notifications.emailAlerts ?? true))}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
              >
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">Profile &amp; Document Reminders</h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        notifications.emailAlerts ?? true
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {notifications.emailAlerts ?? true ? 'Active reminders' : 'Muted'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Get reminders to review your profiling information, religious observances, and contact numbers.
                  </p>
                </div>
                <ToggleSwitch
                  checked={notifications.emailAlerts ?? true}
                  disabled={loadingSettings || settingsSaving}
                  onChange={(checked) => updateNotificationPreference('emailAlerts', checked)}
                  label="Profile & Document Reminders"
                />
              </div>

              {/* Security & Account Alerts */}
              <div
                onClick={() => updateNotificationPreference('securityAlerts', !(notifications.securityAlerts ?? true))}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
              >
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">Security &amp; Account Alerts</h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        notifications.securityAlerts ?? true
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {notifications.securityAlerts ?? true ? 'Active alerts' : 'Muted'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Notifications regarding password updates, new sessions, and critical system announcements.
                  </p>
                </div>
                <ToggleSwitch
                  checked={notifications.securityAlerts ?? true}
                  disabled={loadingSettings || settingsSaving}
                  onChange={(checked) => updateNotificationPreference('securityAlerts', checked)}
                  label="Security & Account Alerts"
                />
              </div>

              {settingsMessage && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{settingsMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PORTAL PREFERENCES (FOR STUDENTS) */}
          {activeTab === 'preferences' && role === 'student' && (
            <div className="space-y-4">
              {/* Compact Mode */}
              <div
                onClick={() => setCompactGrades(!compactGrades)}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
              >
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">Compact Academic Records View</h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        compactGrades ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {compactGrades ? 'Compact layout active' : 'Standard spacing'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Condense subject tables to show more semesters and course evaluations on screen at once.
                  </p>
                </div>
                <ToggleSwitch
                  checked={compactGrades}
                  onChange={(checked) => setCompactGrades(checked)}
                  label="Compact Academic Records View"
                />
              </div>

              {/* GWA Privacy Shield */}
              <div
                onClick={() => setGwaPrivacyShield(!gwaPrivacyShield)}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
              >
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">GWA Privacy Shield</h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        gwaPrivacyShield ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {gwaPrivacyShield ? 'Shield active (Blurred until hover)' : 'Visible publicly'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Soft-blur cumulative and semester GWA in public view until you hover over them.
                  </p>
                </div>
                <ToggleSwitch
                  checked={gwaPrivacyShield}
                  onChange={(checked) => setGwaPrivacyShield(checked)}
                  label="GWA Privacy Shield"
                />
              </div>

              {/* Date Format */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">Date Display Format</h4>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-600">
                      Preview: {formatPortalDate(new Date(), dateFormat)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Preferred layout for dates across academic records and evaluation logs.
                  </p>
                </div>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-3.5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Shield className="h-3.5 w-3.5 text-emerald-600" />
            <span>SAPES Security · BukSU College of Technologies</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
