const { recordAuditLog } = require('../utils/auditLogger');
const { parseDeviceInfo } = require('../utils/deviceInfo');

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const DEFAULT_LOCKOUT_MS = 2 * 60 * 1000;  // 2 minutes countdown as requested
const DEFAULT_MAX_ACCOUNT_FAILURES = 5;    // 5 failed attempts per account
const DEFAULT_MAX_IP_REQUESTS = 20;        // 20 requests per IP

// In-memory sliding window stores
// accountFailures: Map<identifier, { count: number, firstAttempt: number, lockedUntil: number }>
const accountFailures = new Map();
// ipRequests: Map<ip, { timestamps: number[], lockedUntil: number }>
const ipRequests = new Map();

function getLockoutDurationMs() {
  const envVal = Number(process.env.LOGIN_LOCKOUT_DURATION_MS);
  return Number.isFinite(envVal) && envVal > 0 ? envVal : DEFAULT_LOCKOUT_MS;
}

function getMaxAccountFailures() {
  const envVal = Number(process.env.LOGIN_MAX_ACCOUNT_FAILURES);
  return Number.isFinite(envVal) && envVal > 0 ? envVal : DEFAULT_MAX_ACCOUNT_FAILURES;
}

function getMaxIpRequests() {
  const envVal = Number(process.env.LOGIN_MAX_IP_REQUESTS);
  return Number.isFinite(envVal) && envVal > 0 ? envVal : DEFAULT_MAX_IP_REQUESTS;
}

function normalizeKey(key) {
  return typeof key === 'string' ? key.trim().toLowerCase() : '';
}

function getClientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req?.ip || req?.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Checks whether an account identifier or IP is currently locked out.
 * Returns { locked: boolean, retryAfterSeconds: number, reason: string }
 */
function getLockoutStatus(identifier, ip) {
  const now = Date.now();
  const normalizedId = normalizeKey(identifier);

  // 1. Check account lockout
  if (normalizedId && accountFailures.has(normalizedId)) {
    const accRecord = accountFailures.get(normalizedId);
    if (accRecord.lockedUntil && accRecord.lockedUntil > now) {
      const remainingSeconds = Math.ceil((accRecord.lockedUntil - now) / 1000);
      return {
        locked: true,
        retryAfterSeconds: remainingSeconds,
        reason: 'account'
      };
    }
    // Lockout expired, reset failures
    if (accRecord.lockedUntil && accRecord.lockedUntil <= now) {
      accountFailures.delete(normalizedId);
    }
  }

  // 2. Check IP lockout
  if (ip && ipRequests.has(ip)) {
    const ipRecord = ipRequests.get(ip);
    if (ipRecord.lockedUntil && ipRecord.lockedUntil > now) {
      const remainingSeconds = Math.ceil((ipRecord.lockedUntil - now) / 1000);
      return {
        locked: true,
        retryAfterSeconds: remainingSeconds,
        reason: 'ip'
      };
    }
    // Lockout expired, reset
    if (ipRecord.lockedUntil && ipRecord.lockedUntil <= now) {
      ipRequests.delete(ip);
    }
  }

  return { locked: false, retryAfterSeconds: 0, reason: '' };
}

/**
 * Express middleware to prevent spam logins and enforce cooldown countdown.
 */
async function checkLoginRateLimit(req, res, next) {
  const { username } = req.body || {};
  const ip = getClientIp(req);
  const status = getLockoutStatus(username, ip);

  if (status.locked) {
    res.set('Retry-After', String(status.retryAfterSeconds));
    res.set('X-RateLimit-Limit', String(getMaxAccountFailures()));
    res.set('X-RateLimit-Remaining', '0');
    res.set('X-RateLimit-Reset', String(Math.floor((Date.now() + status.retryAfterSeconds * 1000) / 1000)));

    return res.status(429).json({
      success: false,
      code: 'SPAM_LOGIN_DETECTED',
      message: `Too many failed login attempts. To prevent spam, login is locked for 2 minutes. Please wait before trying again.`,
      retryAfterSeconds: status.retryAfterSeconds,
      lockoutType: status.reason
    });
  }

  return next();
}

/**
 * Records a failed login attempt for an identifier and IP.
 * Triggers a 2-minute lockout if threshold is reached.
 */
async function recordLoginFailure(identifier, ip, req = null) {
  const now = Date.now();
  const normalizedId = normalizeKey(identifier);
  const lockoutMs = getLockoutDurationMs();
  const maxFailures = getMaxAccountFailures();
  const maxIpReqs = getMaxIpRequests();

  let locked = false;
  let retryAfterSeconds = 0;

  // Track account-level failure
  if (normalizedId) {
    let accRecord = accountFailures.get(normalizedId);
    if (!accRecord || now - accRecord.firstAttempt > DEFAULT_WINDOW_MS) {
      accRecord = { count: 1, firstAttempt: now, lockedUntil: 0 };
    } else {
      accRecord.count += 1;
    }

    if (accRecord.count >= maxFailures) {
      accRecord.lockedUntil = now + lockoutMs;
      locked = true;
      retryAfterSeconds = Math.ceil(lockoutMs / 1000);
    }
    accountFailures.set(normalizedId, accRecord);
  }

  // Track IP-level requests
  if (ip) {
    let ipRecord = ipRequests.get(ip);
    if (!ipRecord) {
      ipRecord = { timestamps: [now], lockedUntil: 0 };
    } else {
      // Filter out timestamps outside window
      ipRecord.timestamps = ipRecord.timestamps.filter((ts) => now - ts < DEFAULT_WINDOW_MS);
      ipRecord.timestamps.push(now);
    }

    if (ipRecord.timestamps.length >= maxIpReqs) {
      ipRecord.lockedUntil = now + lockoutMs;
      locked = true;
      retryAfterSeconds = Math.ceil(lockoutMs / 1000);
    }
    ipRequests.set(ip, ipRecord);
  }

  // Record audit log if lockout was triggered
  if (locked) {
    const deviceInfo = req ? parseDeviceInfo(req) : { browser: 'Unknown', os: 'Unknown', summary: 'Unknown' };
    await recordAuditLog({
      userId: null,
      userRole: 'system',
      userModel: 'System',
      action: 'LOGIN_RATE_LIMITED',
      targetType: 'security',
      targetId: null,
      details: {
        identifier: normalizedId,
        ip,
        retryAfterSeconds,
        lockoutDurationSeconds: Math.ceil(lockoutMs / 1000),
        reason: 'Excessive failed login attempts (anti-spam 2-minute lockout)',
        deviceInfo
      }
    }).catch(() => {});
  }

  return { locked, retryAfterSeconds };
}

/**
 * Resets failure counters for an account upon successful login.
 */
function clearLoginFailures(identifier, ip) {
  const normalizedId = normalizeKey(identifier);
  if (normalizedId) {
    accountFailures.delete(normalizedId);
  }
}

/**
 * Reset all rate limiting state (for testing).
 */
function resetRateLimits() {
  accountFailures.clear;
  accountFailures.clear();
  ipRequests.clear();
}

module.exports = {
  checkLoginRateLimit,
  recordLoginFailure,
  clearLoginFailures,
  getLockoutStatus,
  resetRateLimits,
  DEFAULT_LOCKOUT_MS
};
