/**
 * Safely parses browser, operating system, and IP address from incoming HTTP requests.
 * Does not invent locations or device identities.
 */
function parseDeviceInfo(req) {
  if (!req) {
    return { browser: '', os: '', ip: '', summary: 'Web browser' };
  }

  const userAgent = String(req.headers?.['user-agent'] || '').trim();
  const rawIp = req.headers?.['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '';
  const ip = typeof rawIp === 'string'
    ? rawIp.split(',')[0].trim().replace(/^::ffff:/, '')
    : '';

  let browser = '';
  if (/edg([ea]|ios)?\//i.test(userAgent)) {
    browser = 'Microsoft Edge';
  } else if (/opr\/|opera/i.test(userAgent)) {
    browser = 'Opera';
  } else if (/chrome|crios/i.test(userAgent)) {
    browser = 'Google Chrome';
  } else if (/firefox|fxios/i.test(userAgent)) {
    browser = 'Mozilla Firefox';
  } else if (/safari/i.test(userAgent) && !/chrome|crios|android/i.test(userAgent)) {
    browser = 'Apple Safari';
  }

  let os = '';
  if (/windows nt/i.test(userAgent)) {
    os = 'Windows';
  } else if (/macintosh|mac os x/i.test(userAgent)) {
    os = 'macOS';
  } else if (/android/i.test(userAgent)) {
    os = 'Android';
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    os = 'iOS';
  } else if (/linux/i.test(userAgent)) {
    os = 'Linux';
  }

  const summary = browser && os
    ? `${browser} on ${os}`
    : (browser || os || (userAgent ? 'Web browser' : ''));

  return {
    browser,
    os,
    ip: ip === '::1' ? '127.0.0.1' : ip,
    summary: summary || 'Web session'
  };
}

module.exports = { parseDeviceInfo };
