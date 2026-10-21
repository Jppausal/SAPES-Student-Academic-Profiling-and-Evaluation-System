import { useEffect, useState } from 'react';
import {
  fetchIntegrationSettings,
  saveIntegrationSettings,
  type IntegrationSettings,
  type IntegrationName,
} from '../../lib/api';
import {
  ShieldCheck,
  Server,
  Lock,
  GraduationCap,
  Sliders,
  CheckCircle2,
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
};

export function AdminSettings({ onAudit }: { onAudit: () => void }) {
  const [section, setSection] = useState('General');
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [health, setHealth] = useState('Checking server…');
  const [healthOk, setHealthOk] = useState(false);

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
              const setting = settings.integrations[name];
              return (
                <div key={name} className="admin-integration-row">
                  <label className="flex items-center justify-between gap-4 font-semibold">
                    {descriptions[name].title}
                    <input
                      type="checkbox"
                      role="switch"
                      aria-label={descriptions[name].title}
                      checked={setting.enabled && setting.configured}
                      disabled={saving || !setting.available || !setting.configured}
                      onChange={(event) => void toggle(name, event.target.checked)}
                    />
                  </label>
                  <p className="mt-2 text-sm">
                    Status: {setting.configured ? 'Configured' : 'Not configured'}
                    {!setting.available ? ' · Unavailable' : ''}
                    {setting.configured && setting.enabled ? ' · Active' : ' · Disabled'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{descriptions[name].description}</p>
                </div>
              );
            })}
          {saving && <p role="status" className="text-xs text-indigo-600 mt-2">Saving configuration…</p>}
        </section>
      )}
    </div>
  );
}
