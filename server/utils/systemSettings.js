const SystemSettings = require('../models/SystemSettings');
const defaults = { googleAuth: true, recaptcha: false, smtp: true, passwordGenerator: true };
const getGoogleClientId = () => process.env.GOOGLE_CLIENT_ID?.trim() || '';

const configuration = (record) => ({
  googleAuth: Boolean(getGoogleClientId(record)),
  recaptcha: Boolean(process.env.RECAPTCHA_SITE_KEY?.trim() && process.env.RECAPTCHA_SECRET_KEY?.trim() && process.env.RECAPTCHA_ALLOWED_HOSTNAMES?.split(',').some(host => host.trim())),
  smtp: Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim()
    && (!process.env.SMTP_USER || process.env.SMTP_PASSWORD)
    && Number(process.env.SMTP_PORT || 587) > 0 && Number(process.env.SMTP_PORT || 587) <= 65535),
  passwordGenerator: true
});

async function readSettings({ includeClientId = false } = {}) {
  const record = await SystemSettings.findById('system').lean();
  const configured = configuration(record);
  const googleClientId = getGoogleClientId(record);
  const integrations = Object.fromEntries(Object.keys(defaults).map(name => [name, {
    enabled: record?.integrations?.[name]?.enabled ?? defaults[name],
    configured: configured[name],
    available: true,
    ...(name === 'recaptcha' && configured.recaptcha ? { siteKey: process.env.RECAPTCHA_SITE_KEY.trim() } : {})
  }]));
  if (includeClientId) {
    integrations.googleAuth.clientId = googleClientId;
  }
  return { integrations };
}

async function requireIntegration(name) {
  const setting = (await readSettings()).integrations[name];
  if (!setting.enabled || !setting.configured) {
    const error = new Error(name === 'googleAuth'
      ? (setting.enabled ? 'Google authentication is not configured.' : 'Google authentication is currently disabled.')
      : (name === 'passwordGenerator'
        ? (setting.enabled ? 'Password generator is not configured.' : 'Password generator is currently disabled.')
        : 'Email service is currently unavailable.'));
    error.status = 503;
    throw error;
  }
}

module.exports = { readSettings, requireIntegration, configuration, getGoogleClientId };
