const SystemSettings = require('../models/SystemSettings');

const defaults = { googleAuth: true, recaptcha: false, smtp: true, passwordGenerator: true };

/**
 * Masks a credential so that only the first 5 characters are visible,
 * and the remaining characters are replaced with asterisks (*).
 * If the string has 5 characters or fewer, displays the full string padded with asterisks.
 * @param {string} val
 * @returns {string}
 */
function maskCredential(val) {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 5) {
    return trimmed + '*'.repeat(5);
  }
  return trimmed.slice(0, 5) + '*'.repeat(trimmed.length - 5);
}

function getEffectiveGoogleClientId(record) {
  return (
    process.env.CUSTOM_CLIENT_ID?.trim() ||
    process.env.CUSTOM_CIENT_ID?.trim() ||
    record?.integrations?.googleAuth?.customClientId?.trim() ||
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    ''
  );
}

function getEffectiveRecaptchaSiteKey(record) {
  return (
    process.env.CUSTOM_RECAPTCHA_SITE_KEY?.trim() ||
    record?.integrations?.recaptcha?.customSiteKey?.trim() ||
    process.env.RECAPTCHA_SITE_KEY?.trim() ||
    ''
  );
}

function getEffectiveRecaptchaSecretKey(record) {
  return (
    process.env.CUSTOM_RECAPTCHA_SECRET_KEY?.trim() ||
    record?.integrations?.recaptcha?.customSecretKey?.trim() ||
    process.env.RECAPTCHA_SECRET_KEY?.trim() ||
    ''
  );
}

function getEffectiveApiNinjasKey(record) {
  return (
    process.env.CUSTOM_API_NINJAS_KEY?.trim() ||
    record?.integrations?.passwordGenerator?.customApiKey?.trim() ||
    process.env.API_NINJAS_API_KEY?.trim() ||
    ''
  );
}

function configuration(record) {
  const googleClientId = getEffectiveGoogleClientId(record);
  const recaptchaSiteKey = getEffectiveRecaptchaSiteKey(record);
  const recaptchaSecretKey = getEffectiveRecaptchaSecretKey(record);
  const allowedHosts = (process.env.RECAPTCHA_ALLOWED_HOSTNAMES || '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);

  return {
    googleAuth: Boolean(googleClientId),
    recaptcha: Boolean(recaptchaSiteKey && recaptchaSecretKey && allowedHosts.length > 0),
    smtp: Boolean(
      process.env.SMTP_HOST?.trim() &&
        process.env.SMTP_FROM?.trim() &&
        (!process.env.SMTP_USER || process.env.SMTP_PASSWORD) &&
        Number(process.env.SMTP_PORT || 587) > 0 &&
        Number(process.env.SMTP_PORT || 587) <= 65535
    ),
    passwordGenerator: true
  };
}

async function readSettings(options = {}) {
  const isAdmin = typeof options === 'boolean' ? options : Boolean(options?.admin);
  const record = options?.record !== undefined ? options.record : await SystemSettings.findById('system').lean();
  const configured = configuration(record);

  const effectiveGoogleClientId = getEffectiveGoogleClientId(record);
  const customGoogleClientId =
    process.env.CUSTOM_CLIENT_ID?.trim() ||
    process.env.CUSTOM_CIENT_ID?.trim() ||
    record?.integrations?.googleAuth?.customClientId?.trim() ||
    '';

  const effectiveRecaptchaSiteKey = getEffectiveRecaptchaSiteKey(record);
  const customRecaptchaSiteKey =
    process.env.CUSTOM_RECAPTCHA_SITE_KEY?.trim() ||
    record?.integrations?.recaptcha?.customSiteKey?.trim() ||
    '';

  const effectiveApiNinjasKey = getEffectiveApiNinjasKey(record);
  const customApiNinjasKey =
    process.env.CUSTOM_API_NINJAS_KEY?.trim() ||
    record?.integrations?.passwordGenerator?.customApiKey?.trim() ||
    '';

  const integrations = {};

  for (const name of Object.keys(defaults)) {
    const isEnabled = record?.integrations?.[name]?.enabled ?? defaults[name];
    const isConfigured = configured[name];

    const item = {
      enabled: isEnabled,
      configured: isConfigured,
      available: true
    };

    if (name === 'googleAuth') {
      if (effectiveGoogleClientId) item.clientId = effectiveGoogleClientId;
      if (isAdmin) {
        item.maskedKey = maskCredential(effectiveGoogleClientId);
        item.maskedDefaultKey = maskCredential(process.env.GOOGLE_CLIENT_ID?.trim() || '');
        item.hasKey = Boolean(effectiveGoogleClientId);
        item.isCustomized = Boolean(customGoogleClientId);
        item.keyLabel = 'Google Client ID';
        item.canCustomize = true;
      }
    } else if (name === 'recaptcha') {
      if (effectiveRecaptchaSiteKey && isConfigured) item.siteKey = effectiveRecaptchaSiteKey;
      if (isAdmin) {
        item.maskedKey = maskCredential(effectiveRecaptchaSiteKey);
        item.maskedDefaultKey = maskCredential(process.env.RECAPTCHA_SITE_KEY?.trim() || '');
        item.hasKey = Boolean(effectiveRecaptchaSiteKey);
        item.isCustomized = Boolean(
          customRecaptchaSiteKey ||
            process.env.CUSTOM_RECAPTCHA_SECRET_KEY?.trim() ||
            record?.integrations?.recaptcha?.customSecretKey?.trim()
        );
        item.keyLabel = 'Site Key';
        item.canCustomize = true;
      }
    } else if (name === 'passwordGenerator') {
      if (isAdmin) {
        item.maskedKey = maskCredential(effectiveApiNinjasKey);
        item.maskedDefaultKey = maskCredential(process.env.API_NINJAS_API_KEY?.trim() || '');
        item.hasKey = Boolean(effectiveApiNinjasKey);
        item.isCustomized = Boolean(customApiNinjasKey);
        item.keyLabel = 'API Key';
        item.canCustomize = true;
      }
    } else if (name === 'smtp') {
      if (isAdmin) {
        item.maskedKey = '';
        item.maskedDefaultKey = '';
        item.hasKey = Boolean(process.env.SMTP_HOST?.trim());
        item.isCustomized = false;
        item.keyLabel = '';
        item.canCustomize = false;
      }
    }

    integrations[name] = item;
  }

  return { integrations };
}

async function requireIntegration(name) {
  const setting = (await readSettings()).integrations[name];
  if (!setting.enabled || !setting.configured) {
    const error = new Error(
      name === 'googleAuth'
        ? setting.enabled
          ? 'Google authentication is not configured.'
          : 'Google authentication is currently disabled.'
        : name === 'passwordGenerator'
        ? setting.enabled
          ? 'Password generator is not configured.'
          : 'Password generator is currently disabled.'
        : 'Email service is currently unavailable.'
    );
    error.status = 503;
    throw error;
  }
}

module.exports = {
  readSettings,
  requireIntegration,
  configuration,
  maskCredential,
  getEffectiveGoogleClientId,
  getEffectiveRecaptchaSiteKey,
  getEffectiveRecaptchaSecretKey,
  getEffectiveApiNinjasKey
};
