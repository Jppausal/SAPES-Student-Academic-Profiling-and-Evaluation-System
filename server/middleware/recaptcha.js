const { readSettings } = require('../utils/systemSettings');

module.exports = async (req, res, next) => {
  try {
    const setting = (await readSettings()).integrations.recaptcha;
    if (!setting.enabled) return next();
    if (!setting.configured) {
      return res.status(503).json({
        success: false,
        message: 'Sign-in verification is enabled but not configured. An administrator must set RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY, and RECAPTCHA_ALLOWED_HOSTNAMES in server/.env, then restart the API.'
      });
    }
    const token = req.body?.recaptchaToken;
    if (typeof token !== 'string' || !token.trim() || token.length > 8192) return res.status(400).json({ success: false, message: 'Complete the reCAPTCHA verification.' });
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      body: new URLSearchParams({ secret: process.env.RECAPTCHA_SECRET_KEY, response: token })
    });
    if (!response.ok) throw new Error('Verification unavailable');
    const result = await response.json();
    const hosts = (process.env.RECAPTCHA_ALLOWED_HOSTNAMES || '').split(',').map(host => host.trim().toLowerCase()).filter(Boolean);
    if (result.success !== true || result['error-codes']?.length || (hosts.length > 0 && !hosts.includes(String(result.hostname || '').toLowerCase()))) {
      return res.status(400).json({ success: false, message: 'Verification failed or expired. Complete reCAPTCHA again.' });
    }
    return next();
  } catch {
    return res.status(503).json({ success: false, message: 'Human verification is unavailable. Please try again.' });
  }
};
