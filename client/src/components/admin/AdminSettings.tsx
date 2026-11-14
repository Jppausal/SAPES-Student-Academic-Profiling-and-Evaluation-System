import { useEffect, useState } from 'react';
import {
  fetchIntegrationSettings,
  saveIntegrationSettings,
  updateIntegrationCredential,
  sendCredentialMfa,
  type IntegrationSettings,
  type IntegrationName,
  fetchActiveAcademicPeriod,
  saveActiveAcademicPeriod,
  type ActiveAcademicPeriod,
} from '../../lib/api';
import { Modal } from '../common/Modal';
import {
  ShieldCheck,
  Server,
  Lock,
  Unlock,
  GraduationCap,
  Sliders,
  CheckCircle2,
  Calendar,
  Clock,
  Save,
  AlertCircle,
  RefreshCw,
  Edit,
  Eye,
  EyeOff,
  RotateCcw,
  Info,
  Key,
  Mail,
  Send,
} from 'lucide-react';

const descriptions: Record<IntegrationName, { title: string; description: string }> = {
  googleAuth: {
    title: 'Google Sign-In',
    description:
      'Allows institutional Google authentication. When disabled, users must sign in with their SAPES identifier and password.',
  },
  recaptcha: {
    title: 'reCAPTCHA Verification',
    description:
      'Requires human verification for password sign-in and password-reset requests. Google sign-in uses its own token verification. Configure a reCAPTCHA v2 checkbox site key, secret key, and allowed hostnames before enabling.',
  },
  smtp: {
    title: 'SMTP / Email Service',
    description:
      'Sends password reset verification codes. When disabled, email-based password changes are unavailable.',
  },
  passwordGenerator: {
    title: 'API Ninjas Password Generator',
    description:
      'Generates high-entropy passwords via the API Ninjas Password Generator API when creating new accounts. When disabled or unconfigured, the system uses the secure built-in cryptographic generator.',
  },
};

export function AdminSettings({ onAudit }: { onAudit: () => void }) {
  const [section, setSection] = useState('General');
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [health, setHealth] = useState('Checking server…');
  const [healthOk, setHealthOk] = useState(false);

  // A116: Academic Period & Evaluation Window Lifecycle State
  const [period, setPeriod] = useState<ActiveAcademicPeriod>({
    schoolYear: '2025-2026',
    semester: '1st Semester',
    isTermGradesLocked: false,
    evaluationWindowOpen: true,
    evaluationDeadline: null,
    announcementMessage: '',
  });
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [periodMessage, setPeriodMessage] = useState('');
  const [periodError, setPeriodError] = useState('');

  // Credential Customization Modal State
  const [editingIntegration, setEditingIntegration] = useState<IntegrationName | null>(null);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [customSecretKeyInput, setCustomSecretKeyInput] = useState('');
  const [showPlaintext, setShowPlaintext] = useState(false);
  const [showSecretPlaintext, setShowSecretPlaintext] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // MFA 2FA State for Credential Customization
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSending, setMfaSending] = useState(false);
  const [mfaSent, setMfaSent] = useState(false);
  const [mfaMaskedEmail, setMfaMaskedEmail] = useState('');
  const [mfaCooldown, setMfaCooldown] = useState(0);

  useEffect(() => {
    if (mfaCooldown <= 0) return;
    const interval = setInterval(() => {
      setMfaCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [mfaCooldown]);

  const openEditModal = (name: IntegrationName) => {
    setEditingIntegration(name);
    setCustomKeyInput('');
    setCustomSecretKeyInput('');
    setShowPlaintext(false);
    setShowSecretPlaintext(false);
    setModalError('');
    setModalSuccess('');
    setMfaCode('');
    setMfaSending(false);
    setMfaSent(false);
    setMfaMaskedEmail('');
    setMfaCooldown(0);
  };

  const closeEditModal = () => {
    if (modalSaving) return;
    setEditingIntegration(null);
    setModalError('');
    setModalSuccess('');
    setMfaCode('');
    setMfaSent(false);
    setMfaMaskedEmail('');
  };

  const handleSendMfa = async () => {
    if (!editingIntegration || mfaSending || mfaCooldown > 0) return;
    setMfaSending(true);
    setModalError('');
    try {
      const res = await sendCredentialMfa(editingIntegration);
      setMfaSent(true);
      setMfaMaskedEmail(res.maskedEmail || 'your authorized email');
      setMfaCooldown(30);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to send MFA verification code.');
    } finally {
      setMfaSending(false);
    }
  };

  const handleSaveCredential = async () => {
    if (!editingIntegration) return;
    if (!customKeyInput.trim()) {
      setModalError('Please enter a valid credential value or click Revert to Default.');
      return;
    }
    if (!mfaCode.trim() || !/^\d{6}$/.test(mfaCode.trim())) {
      setModalError('Please request and enter the 6-digit MFA verification code sent to your email.');
      return;
    }
    setModalSaving(true);
    setModalError('');
    setModalSuccess('');
    try {
      const updated = await updateIntegrationCredential({
        integration: editingIntegration,
        customKey: customKeyInput.trim(),
        ...(editingIntegration === 'recaptcha' && customSecretKeyInput.trim()
          ? { customSecretKey: customSecretKeyInput.trim() }
          : {}),
        mfaCode: mfaCode.trim(),
      });
      setSettings(updated);
      setModalSuccess(`Successfully verified and updated ${descriptions[editingIntegration]?.title || editingIntegration} credential.`);
      onAudit();
      setTimeout(() => {
        closeEditModal();
      }, 1200);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to update integration credential.');
    } finally {
      setModalSaving(false);
    }
  };

  const handleRevertCredential = async () => {
    if (!editingIntegration) return;
    if (!mfaCode.trim() || !/^\d{6}$/.test(mfaCode.trim())) {
      setModalError('Please request and enter the 6-digit MFA verification code sent to your email to authorize reverting credentials.');
      return;
    }
    setModalSaving(true);
    setModalError('');
    setModalSuccess('');
    try {
      const updated = await updateIntegrationCredential({
        integration: editingIntegration,
        reset: true,
        mfaCode: mfaCode.trim(),
      });
      setSettings(updated);
      setModalSuccess(`Reverted ${descriptions[editingIntegration]?.title || editingIntegration} to default (.env) credentials.`);
      onAudit();
      setTimeout(() => {
        closeEditModal();
      }, 1200);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to revert integration credential.');
    } finally {
      setModalSaving(false);
    }
  };

  useEffect(() => {
    fetchActiveAcademicPeriod()
      .then(setPeriod)
      .catch((reason) => console.error('Academic period load error:', reason));
  }, []);

  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPeriod(true);
    setPeriodError('');
    setPeriodMessage('');
    try {
      const updated = await saveActiveAcademicPeriod(period);
      setPeriod(updated);
      setPeriodMessage('Active academic term & evaluation lifecycle policies saved successfully.');
    } catch (reason) {
      setPeriodError(reason instanceof Error ? reason.message : 'Unable to save academic period settings.');
    } finally {
      setSavingPeriod(false);
    }
  };

  useEffect(() => {
    fetchIntegrationSettings(true)
      .then(setSettings)
      .catch((reason) => setError(reason.message));

    const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    fetch(`${base}/api/health`)
      .then(async (response) => {
        const result = await response.json();
        const ok = response.ok && result.status === 'ok';
        setHealthOk(ok);
        setHealth(ok ? 'API online · Database connected' : 'API or database unavailable');
      })
      .catch(() => {
        setHealthOk(false);
        setHealth('API unreachable');
      });
  }, []);

  async function toggle(name: IntegrationName, enabled: boolean) {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      setSettings(await saveIntegrationSettings({ [name]: { enabled } }));
      setMessage(`${descriptions[name].title} ${enabled ? 'enabled' : 'disabled'} successfully.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  }

  const categories = ['General', 'Security', 'Academic', 'System & Audit', 'App settings'];

  return (
    <div className="admin-page-stack">
      <section className="admin-panel admin-panel-body">
        <div className="flex items-center gap-3">
          <span className="admin-heading-icon"><Sliders className="h-5 w-5" /></span>
          <div>
            <h2 className="text-lg font-bold">System Settings &amp; Access Controls</h2>
            <p className="text-sm text-slate-600">
              Manage system configuration, security policies, and integrations necessary for the secure operation of SAPES.
            </p>
          </div>
        </div>
      </section>

      <nav className="admin-settings-navigation" aria-label="System settings categories">
        {categories.map((name) => (
          <button
            key={name}
            type="button"
            aria-current={section === name ? 'page' : undefined}
            onClick={() => setSection(name)}
          >
            {name}
          </button>
        ))}
      </nav>

      {error && <p role="alert" className="admin-alert admin-alert-error">{error}</p>}
      {message && <p role="status" className="admin-alert admin-alert-success">{message}</p>}

      {section === 'General' && (
        <section className="admin-panel admin-panel-body space-y-4">
          <div className="flex items-center gap-2 text-slate-800">
            <Server className="h-4 w-4 text-indigo-600" />
            <h3 className="font-bold text-base">General Information</h3>
          </div>
          <p className="text-sm text-slate-600">
            Institutional configuration and deployment environment settings for SAPES.
          </p>
          <div className="admin-form-grid mt-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs text-slate-500 block">Institution</span>
              <strong className="text-sm text-slate-900">Bukidnon State University (BukSU)</strong>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs text-slate-500 block">Department / Unit</span>
              <strong className="text-sm text-slate-900">College of Technologies</strong>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs text-slate-500 block">System Core</span>
              <strong className="text-sm text-slate-900">SAPES · Academic Profiling &amp; Evaluation</strong>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs text-slate-500 block">Deployment Status</span>
              <strong className="text-sm text-emerald-700 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Production Active
              </strong>
            </div>
          </div>
        </section>
      )}

      {section === 'Security' && (
        <section className="admin-panel admin-panel-body space-y-4">
          <div className="flex items-center gap-2 text-slate-800">
            <Lock className="h-4 w-4 text-indigo-600" />
            <h3 className="font-bold text-base">Security Policies &amp; Access Controls</h3>
          </div>
          <p className="text-sm text-slate-600">
            Enforced server-side mechanisms ensuring authenticated, authorized, and audited operation of SAPES.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1">
                Session &amp; Token Security
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                JWT sessions are cryptographically signed with HMAC-SHA256, strictly bound to active user accounts, and validated against the database session store.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1">
                Role-Based Access Control (RBAC)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Granular permission gates (<code>manage_users</code>, <code>view_reports</code>, <code>submit_evaluations</code>, <code>view_audit_logs</code>) prevent privilege escalation.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1">
                Credential &amp; Password Policies
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Passwords are protected using bcrypt salted hashes. Password resets require verified single-use authorization tokens sent via institutional email.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1">
                Security Audit Trails
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                All administrative modifications, role permission changes, system setting updates, and evaluations are logged immutably in MongoDB.
              </p>
            </div>
          </div>
        </section>
      )}

      {section === 'Academic' && (
        <div className="space-y-4">
          {/* A116: Academic Term Lifecycle Management Form */}
          <section className="admin-panel admin-panel-body space-y-4">
            <div className="flex items-center gap-2 text-slate-800">
              <Calendar className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-base">Academic Term &amp; Advising Window Lifecycle</h3>
                <p className="text-xs text-slate-500">
                  Configure the active institutional school year, semester, locked past records, and evaluation cutoff deadline.
                </p>
              </div>
            </div>

            {periodError && <p role="alert" className="admin-alert admin-alert-error">{periodError}</p>}
            {periodMessage && <p role="status" className="admin-alert admin-alert-success">{periodMessage}</p>}

            <form onSubmit={handleSavePeriod} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="academic-school-year" className="block text-xs font-semibold text-slate-700 mb-1">
                    Active School Year (AY)
                  </label>
                  <input
                    id="academic-school-year"
                    type="text"
                    value={period.schoolYear}
                    onChange={(e) => setPeriod({ ...period, schoolYear: e.target.value })}
                    placeholder="e.g. 2025-2026"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold"
                    required
                  />
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Official academic calendar year</span>
                </div>

                <div>
                  <label htmlFor="academic-semester" className="block text-xs font-semibold text-slate-700 mb-1">
                    Active Term / Semester
                  </label>
                  <select
                    id="academic-semester"
                    value={period.semester}
                    onChange={(e) => setPeriod({ ...period, semester: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                    <option value="Midyear">Midyear</option>
                  </select>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Current enrollment term</span>
                </div>
              </div>

              {/* Toggles: Lock Past Terms + Open/Close Evaluation Window */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                      {period.isTermGradesLocked ? (
                        <Lock className="h-4 w-4 text-amber-600" />
                      ) : (
                        <Unlock className="h-4 w-4 text-slate-500" />
                      )}
                      <span>Lock Historical Term Grades</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      When enabled, subjects for semesters older than {period.schoolYear} {period.semester} cannot be modified.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="lock-term-grades"
                    checked={period.isTermGradesLocked}
                    onChange={(e) => setPeriod({ ...period, isTermGradesLocked: e.target.checked })}
                    className="mt-1 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                      <Clock className="h-4 w-4 text-indigo-600" />
                      <span>Faculty Advising &amp; Evaluation Window</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {period.evaluationWindowOpen
                        ? 'Window is OPEN. Faculty can assign and update evaluations.'
                        : 'Window is CLOSED. Faculty submissions are blocked.'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="eval-window-open"
                    checked={period.evaluationWindowOpen}
                    onChange={(e) => setPeriod({ ...period, evaluationWindowOpen: e.target.checked })}
                    className="mt-1 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Deadline & Notice */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="eval-deadline" className="block text-xs font-semibold text-slate-700 mb-1">
                    Evaluation Cutoff Deadline
                  </label>
                  <input
                    id="eval-deadline"
                    type="datetime-local"
                    value={
                      period.evaluationDeadline
                        ? new Date(period.evaluationDeadline).toISOString().slice(0, 16)
                        : ''
                    }
                    onChange={(e) =>
                      setPeriod({
                        ...period,
                        evaluationDeadline: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Optional cutoff date/time; alerts faculty of approaching evaluation closure
                  </span>
                </div>

                <div>
                  <label htmlFor="eval-announcement" className="block text-xs font-semibold text-slate-700 mb-1">
                    Advising &amp; Evaluation Banner Notice
                  </label>
                  <input
                    id="eval-announcement"
                    type="text"
                    value={period.announcementMessage}
                    onChange={(e) => setPeriod({ ...period, announcementMessage: e.target.value })}
                    placeholder="e.g. Advising window for 1st Sem AY 2025-2026 closes on Nov 15"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Broadcasted to faculty evaluators on their evaluation screens
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPeriod}
                  className="admin-primary-button text-xs py-2 px-4"
                >
                  {savingPeriod ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Lifecycle Settings...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Academic Period Policy</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* Reference GWA Rules */}
          <section className="admin-panel admin-panel-body space-y-4">
            <div className="flex items-center gap-2 text-slate-800">
              <GraduationCap className="h-4 w-4 text-indigo-600" />
              <h3 className="font-bold text-base">Academic Evaluation Rules &amp; GWA Policies</h3>
            </div>
            <p className="text-sm text-slate-600">
              Academic calculations and evaluation eligibility rules enforced across student records.
            </p>

            <div className="space-y-3 mt-3 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <strong className="block text-slate-900 mb-1">Unit-Weighted GWA Calculation</strong>
                GWA = (Sum of Grade × Units) / (Total Units). Dropped, ungraded, and zero-unit subjects are strictly excluded from calculation.
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <strong className="block text-slate-900 mb-1">Major vs. Overall Subject GWA</strong>
                Major subject GWA evaluates curriculum-flagged major courses separately to inform faculty evaluation of specialized competency.
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <strong className="block text-slate-900 mb-1">Academic Status &amp; Probation Rules</strong>
                Probation is tracked both historically and dynamically. Students with failing marks or incomplete statuses are highlighted for faculty review.
              </div>
            </div>
          </section>
        </div>
      )}

      {section === 'System & Audit' && (
        <section className="admin-panel admin-panel-body space-y-4">
          <div className="flex items-center gap-2 text-slate-800">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <h3 className="font-bold text-base">System Health &amp; Audit Trail Monitoring</h3>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">Database &amp; API Connectivity</span>
              <span className={`inline-flex items-center gap-1.5 font-semibold text-sm ${healthOk ? 'text-emerald-700' : 'text-rose-700'}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${healthOk ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {health}
              </span>
            </div>
            <button
              type="button"
              className="admin-primary-button"
              onClick={onAudit}
            >
              Open Audit Logs
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Use the audit logs to monitor administrator actions, faculty evaluations, and user authentication events.
          </p>
        </section>
      )}

      {(section === 'App settings' ||
        section === 'App Settings' ||
        section === 'app settings' ||
        section === 'Integrations') && (
        <section className="admin-panel admin-panel-body">
          <h3 className="font-bold">App Settings &amp; External Integrations</h3>
          <p className="text-sm text-slate-500 mb-4">
            Manage institutional integrations and external authentication services. Modifying these settings will create an entry in the system audit log.
          </p>
          {!settings && !error && <p role="status">Loading app settings…</p>}
          {settings &&
            (Object.keys(descriptions) as IntegrationName[]).map((name) => {
              const setting = settings?.integrations?.[name] ?? {
                enabled: true,
                configured: true,
                available: true,
              };
              const isConfigured = Boolean(setting.configured);
              const isEnabled = Boolean(setting.enabled);
              const isAvailable = setting.available !== false;
              return (
                <div key={name} className="admin-integration-row">
                  <label className="flex items-center justify-between gap-4 font-semibold">
                    {descriptions[name].title}
                    <input
                      type="checkbox"
                      role="switch"
                      aria-label={descriptions[name].title}
                      checked={isEnabled && isConfigured}
                      disabled={saving || !isAvailable || !isConfigured}
                      onChange={(event) => void toggle(name, event.target.checked)}
                    />
                  </label>
                  <p className="mt-2 text-sm">
                    Status: {isConfigured ? 'Configured' : 'Not configured'}
                    {!isAvailable ? ' · Unavailable' : ''}
                    {isConfigured && isEnabled ? ' · Active' : ' · Disabled'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{descriptions[name].description}</p>

                  {/* Credential Preview & Customization */}
                  {setting.canCustomize !== false && name !== 'smtp' && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-md">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {setting.keyLabel || (name === 'googleAuth' ? 'Google Client ID' : name === 'recaptcha' ? 'Site Key' : 'API Key')}:
                          </span>
                          {setting.isCustomized ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Customized
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                              Default (.env)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {setting.maskedKey ? (
                            <code className="text-xs font-mono font-medium px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 tracking-wider break-all">
                              {setting.maskedKey}
                            </code>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No key configured</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openEditModal(name)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-xs transition-colors self-start sm:self-auto"
                        title={`Customize ${descriptions[name].title} API Key / Client ID`}
                      >
                        <Edit className="w-3.5 h-3.5 text-slate-500" />
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          {saving && <p role="status" className="text-xs text-indigo-600 mt-2">Saving configuration…</p>}
        </section>
      )}

      {/* Credential Customization Modal */}
      {editingIntegration && (
        <Modal
          isOpen={Boolean(editingIntegration)}
          onClose={closeEditModal}
          title={`Customize ${descriptions[editingIntegration]?.title} Credentials`}
          subtitle="Configure a client-specific API key or Client ID without modifying backend source code."
          maxWidth="xl"
        >
          <div className="space-y-4 py-1">
            {/* Information Banner */}
            <div className="rounded-xl p-3.5 bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/90 dark:border-blue-800/80 text-xs text-blue-900 dark:text-blue-100 flex items-start gap-3 shadow-2xs">
              <div className="w-6 h-6 rounded-md bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-blue-950 dark:text-blue-50">Custom Credential Override</p>
                <p className="text-blue-800/90 dark:text-blue-200/90 leading-relaxed text-[11.5px]">
                  Any custom key saved here is written to <code className="font-mono bg-blue-100 dark:bg-blue-900/80 px-1 py-0.5 rounded text-blue-900 dark:text-blue-100 font-semibold">server/.env</code> and the database, immediately overriding instructor defaults. You can revert to defaults at any time.
                </p>
              </div>
            </div>

            {/* Current Status Info */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Active Configuration</span>
                {settings?.integrations?.[editingIntegration]?.isCustomized ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Client Customized
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                    Default (.env)
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Current Key:</span>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.5 rounded text-xs border border-indigo-200 dark:border-indigo-800 shrink-0">
                      {(settings?.integrations?.[editingIntegration]?.maskedKey || 'None').slice(0, 5)}
                    </span>
                    <span className="font-mono text-slate-500 dark:text-slate-400 text-xs truncate tracking-wider">
                      {(settings?.integrations?.[editingIntegration]?.maskedKey || '').slice(5)}
                    </span>
                  </div>
                </div>
              </div>

              {settings?.integrations?.[editingIntegration]?.maskedDefaultKey && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                  <span className="font-medium">Default Reference:</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400 truncate max-w-[280px]">
                    {settings.integrations[editingIntegration].maskedDefaultKey}
                  </span>
                </div>
              )}
            </div>

            {/* Form Input for Custom Key */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                New Custom {settings?.integrations?.[editingIntegration]?.keyLabel || 'Client ID / API Key'}
              </label>
              <div className="relative">
                <input
                  type={showPlaintext ? 'text' : 'password'}
                  value={customKeyInput}
                  onChange={(e) => setCustomKeyInput(e.target.value)}
                  placeholder={`Paste or enter custom ${settings?.integrations?.[editingIntegration]?.keyLabel || 'key'}...`}
                  className="w-full text-xs font-mono pr-10 px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                  disabled={modalSaving}
                />
                <button
                  type="button"
                  onClick={() => setShowPlaintext((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                  title={showPlaintext ? 'Hide value' : 'Show value'}
                >
                  {showPlaintext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Visible only on first 5 characters once saved. Remaining characters will be masked automatically.
              </p>
            </div>

            {/* If recaptcha, also secret key input */}
            {editingIntegration === 'recaptcha' && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                  New Custom Secret Key (Optional)
                </label>
                <div className="relative">
                  <input
                    type={showSecretPlaintext ? 'text' : 'password'}
                    value={customSecretKeyInput}
                    onChange={(e) => setCustomSecretKeyInput(e.target.value)}
                    placeholder="Enter custom reCAPTCHA Secret Key..."
                    className="w-full text-xs font-mono pr-10 px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                    disabled={modalSaving}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretPlaintext((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                    title={showSecretPlaintext ? 'Hide secret' : 'Show secret'}
                  >
                    {showSecretPlaintext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Two-Factor Authorization (MFA) Block */}
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-b from-indigo-50/80 to-indigo-50/40 dark:from-indigo-950/40 dark:to-indigo-950/20 p-4 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-xs shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Two-Factor Authorization (MFA)
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Code will be sent to <strong className="text-slate-900 dark:text-white font-semibold">{mfaSent ? mfaMaskedEmail : 'lolenseu.maureal@gmail.com'}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSendMfa}
                  disabled={mfaSending || mfaCooldown > 0 || modalSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {mfaSending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {mfaCooldown > 0
                    ? `Resend in ${mfaCooldown}s`
                    : mfaSent
                    ? 'Resend Code'
                    : 'Send Code to Email'}
                </button>
              </div>

              {mfaSent && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Verification code sent to <strong>{mfaMaskedEmail}</strong> (valid for 10 minutes).
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Enter 6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="0 0 0 0 0 0"
                  className="w-full text-center tracking-[0.5em] font-mono text-base font-bold py-2.5 px-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                  disabled={modalSaving}
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Required for authorization. Credentials will be pre-flight verified before applying.
                </p>
              </div>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 flex items-center gap-2.5 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-medium">{modalError}</span>
              </div>
            )}

            {modalSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{modalSuccess}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 gap-3">
              <div>
                {settings?.integrations?.[editingIntegration]?.isCustomized && (
                  <button
                    type="button"
                    onClick={handleRevertCredential}
                    disabled={modalSaving || mfaCode.trim().length !== 6}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/70 border border-amber-300 dark:border-amber-700 rounded-lg transition-all disabled:opacity-40"
                    title={mfaCode.trim().length !== 6 ? 'MFA verification code is required to revert' : undefined}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Revert to Default
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={modalSaving}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCredential}
                  disabled={modalSaving || !customKeyInput.trim() || mfaCode.trim().length !== 6}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title={mfaCode.trim().length !== 6 ? 'Enter 6-digit MFA verification code to save' : undefined}
                >
                  {modalSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {modalSaving ? 'Validating & Saving...' : 'Save & Apply'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
