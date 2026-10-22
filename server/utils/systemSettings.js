const SystemSettings = require('../models/SystemSettings');
const defaults = { googleAuth: true, recaptcha: false, smtp: true };
const configuration = () => ({
  googleAuth: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
  recaptcha: Boolean(process.env.RECAPTCHA_SITE_KEY?.trim() && process.env.RECAPTCHA_SECRET_KEY?.trim() && process.env.RECAPTCHA_ALLOWED_HOSTNAMES?.split(',').some(host => host.trim())),
  smtp: Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim()
    && (!process.env.SMTP_USER || process.env.SMTP_PASSWORD)
    && Number(process.env.SMTP_PORT || 587) > 0 && Number(process.env.SMTP_PORT || 587) <= 65535)
});

async function readSettings() {
  const record = await SystemSettings.findById('system').lean();
  const configured = configuration();
  return { integrations: Object.fromEntries(Object.keys(defaults).map(name => [name, {
    enabled: record?.integrations?.[name]?.enabled ?? defaults[name],
    configured: configured[name],
    available: true,
    ...(name === 'recaptcha' && configured.recaptcha ? { siteKey: process.env.RECAPTCHA_SITE_KEY.trim() } : {})
  }])) };
}

async function requireIntegration(name) {
  const setting = (await readSettings()).integrations[name];
  if (!setting.enabled || !setting.configured) {
    const error = new Error(name === 'googleAuth'
      ? (setting.enabled ? 'Google authentication is not configured.' : 'Google authentication is currently disabled.')
      : 'Email service is currently unavailable.');
    error.status = 503;
    throw error;
  }
}

module.exports = { readSettings, requireIntegration, configuration };
