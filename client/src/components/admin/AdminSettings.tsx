import { useEffect, useState } from 'react';
import { fetchIntegrationSettings, saveIntegrationSettings, type IntegrationSettings, type IntegrationName } from '../../lib/api';

const descriptions: Record<IntegrationName, { title: string; description: string }> = {
  googleAuth: { title: 'Google Sign-In', description: 'Allows institutional Google authentication. When disabled, users must sign in with their SAPES identifier and password.' },
  recaptcha: { title: 'reCAPTCHA', description: 'Not implemented. This control cannot be enabled.' },
  smtp: { title: 'SMTP / Email', description: 'Sends password reset verification codes. When disabled, email-based password changes are unavailable.' }
};

export function AdminSettings({ onAudit }: { onAudit: () => void }) {
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [health, setHealth] = useState('Checking server…');
  useEffect(() => {
    fetchIntegrationSettings(true).then(setSettings).catch(reason => setError(reason.message));
    const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    fetch(`${base}/api/health`).then(async response => {
      const result = await response.json();
      setHealth(response.ok && result.status === 'ok' ? 'API online · Database connected' : 'API or database unavailable');
    }).catch(() => setHealth('API unreachable'));
  }, []);
  async function toggle(name: IntegrationName, enabled: boolean) {
    setSaving(true); setError(''); setMessage('');
    try {
      setSettings(await saveIntegrationSettings({ [name]: { enabled } }));
      setMessage(`${descriptions[name].title} ${enabled ? 'enabled' : 'disabled'}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save settings.'); }
    finally { setSaving(false); }
  }
  return <div className="admin-page-stack">
    <section className="admin-panel admin-panel-body"><h2 className="text-lg font-bold">App Settings</h2><p>Manage system-wide integrations. Credentials remain on the server.</p></section>
    {error && <p role="alert" className="admin-alert admin-alert-error">{error}</p>}
    {message && <p role="status" className="admin-alert admin-alert-success">{message}</p>}
    <section className="admin-panel admin-panel-body"><h3 className="font-bold">General</h3><p>SAPES · Bukidnon State University</p><p className="text-sm text-slate-500">Maintenance mode is not supported.</p></section>
    <section className="admin-panel admin-panel-body"><h3 className="font-bold">Integrations</h3>
      {!settings && !error && <p role="status">Loading integrations…</p>}
      {settings && (Object.keys(descriptions) as IntegrationName[]).map(name => {
        const setting = settings.integrations[name];
        return <div key={name} className="mt-4 rounded-lg border border-slate-200 p-4">
          <label className="flex items-center justify-between gap-4 font-semibold">{descriptions[name].title}
            <input type="checkbox" role="switch" aria-label={descriptions[name].title} checked={setting.enabled && setting.configured} disabled={saving || !setting.available || !setting.configured} onChange={event => void toggle(name, event.target.checked)} />
          </label>
          <p className="mt-2 text-sm">Status: {setting.configured ? 'Configured' : 'Not configured'}{!setting.available ? ' · Unavailable' : ''}</p>
          <p className="mt-1 text-sm text-slate-600">{descriptions[name].description}</p>
        </div>;
      })}
      {saving && <p role="status">Saving…</p>}
    </section>
    <section className="admin-panel admin-panel-body"><h3 className="font-bold">Security</h3><p>JWT sessions, account-status checks, role permissions, and email verification for password reset are enforced by the server.</p><p className="text-sm text-slate-500">App Settings requires administrator access with manage_users permission.</p></section>
    <section className="admin-panel admin-panel-body"><h3 className="font-bold">Academic</h3><p>Overall and major-subject GWA use unit-weighted recorded grades. Dropped, ungraded, and zero-unit subjects are excluded. Academic rules are read-only here.</p></section>
    <section className="admin-panel admin-panel-body"><h3 className="font-bold">System &amp; Audit</h3><p role="status">{health}</p><button type="button" className="admin-secondary-button mt-3" onClick={onAudit}>View audit logs</button></section>
  </div>;
}
