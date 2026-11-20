const { recordAuditLog } = require('../utils/auditLogger');
const { parseDeviceInfo } = require('../utils/deviceInfo');

const registeredStores = [];

function getClientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req?.ip || req?.socket?.remoteAddress || '127.0.0.1';
}

function normalizeKey(key) {
  return typeof key === 'string' ? key.trim().toLowerCase() : '';
}

function resolveAccountModel(role) {
  switch (role) {
    case 'admin':
      return 'AdminUser';
    case 'faculty':
      return 'FacultyUser';
    case 'student':
      return 'Student';
    default:
      return 'System';
  }
}

/**
 * Creates a sliding-window transaction rate limiter middleware for Express.
 *
 * @param {Object} options
 * @param {string} options.name Transaction identifier (e.g. 'PASSWORD_RESET_REQUEST')
 * @param {number} options.windowMs Time window in milliseconds
 * @param {number} options.max Maximum allowed requests in window
 * @param {number} [options.lockoutMs] Lockout duration in milliseconds when exceeded (defaults to windowMs)
 * @param {Function} [options.keyGenerator] Function returning the rate-limit bucket key
 * @param {string} [options.message] User-facing error message
 * @param {string} [options.code] Error code returned to client (default 'RATE_LIMIT_EXCEEDED')
 * @param {boolean} [options.auditOnLimit=true] Whether to record an audit log when triggered
 */
function createTransactionRateLimiter(options = {}) {
  const {
    name = 'TRANSACTION',
    windowMs = 60 * 1000,
    max = 20,
    lockoutMs,
    keyGenerator = (req) => req.user?.userId || getClientIp(req),
    message,
    code = 'RATE_LIMIT_EXCEEDED',
    auditOnLimit = true
  } = options;

  const resolvedLockoutMs = Number.isFinite(lockoutMs) && lockoutMs > 0 ? lockoutMs : windowMs;
  const store = new Map();

  const middleware = async (req, res, next) => {
    if (process.env.DISABLE_RATE_LIMITS === 'true') {
      return next();
    }

    const now = Date.now();
    const rawKey = keyGenerator(req);
    const key = normalizeKey(String(rawKey || getClientIp(req)));
    const ip = getClientIp(req);

    let record = store.get(key);

    // 1. Check if currently locked out
    if (record?.lockedUntil && record.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      res.set('Retry-After', String(retryAfterSeconds));
      res.set('X-RateLimit-Limit', String(max));
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', String(Math.floor(record.lockedUntil / 1000)));

      return res.status(429).json({
        success: false,
        code,
        message:
          message ||
          `Too many requests for ${name.toLowerCase().replace(/_/g, ' ')}. Please wait ${retryAfterSeconds} seconds before trying again.`,
        retryAfterSeconds
      });
    }

    // 2. Clear expired lockouts
    if (record?.lockedUntil && record.lockedUntil <= now) {
      record = { timestamps: [], lockedUntil: 0 };
    }

    if (!record) {
      record = { timestamps: [], lockedUntil: 0 };
    }

    // 3. Sliding window: keep timestamps within active window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    if (record.timestamps.length >= max) {
      record.lockedUntil = now + resolvedLockoutMs;
      store.set(key, record);
      const retryAfterSeconds = Math.ceil(resolvedLockoutMs / 1000);

      res.set('Retry-After', String(retryAfterSeconds));
      res.set('X-RateLimit-Limit', String(max));
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', String(Math.floor((now + resolvedLockoutMs) / 1000)));

      if (auditOnLimit) {
        try {
          const deviceInfo = parseDeviceInfo(req);
          recordAuditLog({
            userId: req.user?.userId || null,
            userRole: req.user?.role || 'system',
            userModel: resolveAccountModel(req.user?.role),
            action: 'TRANSACTION_RATE_LIMITED',
            targetType: 'security',
            targetId: req.user?.userId || null,
            details: {
              transaction: name,
              key,
              ip,
              retryAfterSeconds,
              endpoint: req.originalUrl || req.baseUrl || req.url,
              method: req.method,
              deviceInfo
            }
          }).catch(() => {});
        } catch {
          // Non-fatal
        }
      }

      return res.status(429).json({
        success: false,
        code,
        message:
          message ||
          `Too many requests for ${name.toLowerCase().replace(/_/g, ' ')}. Please wait ${retryAfterSeconds} seconds before trying again.`,
        retryAfterSeconds
      });
    }

    // 4. Record new attempt
    record.timestamps.push(now);
    store.set(key, record);

    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(Math.max(0, max - record.timestamps.length)));
    res.set('X-RateLimit-Reset', String(Math.floor((record.timestamps[0] + windowMs) / 1000)));

    return next();
  };

  middleware.reset = () => store.clear();
  middleware.getStore = () => store;
  registeredStores.push(store);

  return middleware;
}

/**
 * Resets all transaction rate limit stores (useful for test isolation).
 */
function resetAllTransactionRateLimits() {
  for (const store of registeredStores) {
    store.clear();
  }
}

// ============================================================================
// Specialized Pre-Configured Transaction Limiters
// ============================================================================

// 1. Password Reset Request: max 10 requests per 15 min per account & IP
const passwordResetRequestLimiter = createTransactionRateLimiter({
  name: 'PASSWORD_RESET_REQUEST',
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PW_RESET_REQ_MAX) || 10,
  lockoutMs: 5 * 60 * 1000,
  keyGenerator: (req) => `${getClientIp(req)}:${normalizeKey(req.body?.username || req.body?.email || '')}`,
  message: 'Too many password reset requests. Please wait 5 minutes before requesting another reset code.'
});

// 2. Password Reset OTP Verification: max 10 attempts per 15 min per account & IP
const passwordResetVerifyLimiter = createTransactionRateLimiter({
  name: 'PASSWORD_RESET_VERIFY',
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PW_RESET_VERIFY_MAX) || 10,
  lockoutMs: 5 * 60 * 1000,
  keyGenerator: (req) => `${getClientIp(req)}:${normalizeKey(req.body?.username || req.body?.email || req.body?.token || '')}`,
  message: 'Too many verification attempts. Please wait 5 minutes before trying again.'
});

// 3. Password Change: max 10 attempts per 15 min per user
const changePasswordLimiter = createTransactionRateLimiter({
  name: 'CHANGE_PASSWORD',
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_CHANGE_PW_MAX) || 10,
  lockoutMs: 5 * 60 * 1000,
  keyGenerator: (req) => req.user?.userId || getClientIp(req),
  message: 'Too many password update attempts. Please wait before trying again.'
});

// 4. Live API Credential Verification: max 20 verifications per 1 min per admin
const credentialVerifyLimiter = createTransactionRateLimiter({
  name: 'CREDENTIAL_VERIFY',
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_CREDENTIAL_VERIFY_MAX) || 20,
  lockoutMs: 60 * 1000,
  keyGenerator: (req) => req.user?.userId || getClientIp(req),
  message: 'Too many live API credential verifications. Please wait 1 minute before testing again.'
});

// 5. Admin MFA Code Dispatch: max 10 sends per 10 min per admin
const mfaSendLimiter = createTransactionRateLimiter({
  name: 'MFA_SEND',
  windowMs: 10 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MFA_SEND_MAX) || 10,
  lockoutMs: 5 * 60 * 1000,
  keyGenerator: (req) => req.user?.userId || getClientIp(req),
  message: 'Too many MFA verification codes requested. Please wait before requesting another code.'
});

// 6. Bulk Student Import: max 10 imports per 5 min per admin
const bulkImportLimiter = createTransactionRateLimiter({
  name: 'BULK_IMPORT',
  windowMs: 5 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_BULK_IMPORT_MAX) || 10,
  lockoutMs: 3 * 60 * 1000,
  keyGenerator: (req) => req.user?.userId || getClientIp(req),
  message: 'Too many bulk import attempts. Please wait before uploading another batch.'
});

// 7. Student Report Export: max 20 exports per 1 min per user
const reportExportLimiter = createTransactionRateLimiter({
  name: 'REPORT_EXPORT',
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_REPORT_EXPORT_MAX) || 20,
  lockoutMs: 60 * 1000,
  keyGenerator: (req) => req.user?.userId || getClientIp(req),
  message: 'Too many report export requests. Please wait a moment before exporting more data.'
});

// 8. Faculty Evaluation Submission: max 30 submissions per 1 min per faculty
const evaluationSubmitLimiter = createTransactionRateLimiter({
  name: 'EVALUATION_SUBMISSION',
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_EVALUATION_MAX) || 30,
  lockoutMs: 60 * 1000,
  keyGenerator: (req) => req.user?.userId || getClientIp(req),
  message: 'Course evaluation submissions are arriving too fast. Please wait a moment before submitting again.'
});

// 9. Enrollment Approval: max 30 approvals per 1 min per officer
const enrollmentApprovalLimiter = createTransactionRateLimiter({
  name: 'ENROLLMENT_APPROVAL',
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_ENROLLMENT_APPROVAL_MAX) || 30,
  lockoutMs: 60 * 1000,
  keyGenerator: (req) => req.user?.userId || getClientIp(req),
  message: 'Enrollment approval actions are arriving too quickly. Please wait a moment before approving another student.'
});

// 10. Student Status Update: max 30 updates per 1 min per user
const studentStatusUpdateLimiter = createTransactionRateLimiter({
  name: 'STUDENT_STATUS_UPDATE',
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_STATUS_UPDATE_MAX) || 30,
  lockoutMs: 60 * 1000,
  keyGenerator: (req) => req.user?.userId || getClientIp(req),
  message: 'Student status updates are arriving too fast. Please wait a moment before updating status again.'
});

// 11. Student Profile Self-Service Update: max 30 updates per 5 min per student
const studentProfileUpdateLimiter = createTransactionRateLimiter({
  name: 'STUDENT_PROFILE_UPDATE',
  windowMs: 5 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PROFILE_UPDATE_MAX) || 30,
  lockoutMs: 2 * 60 * 1000,
  keyGenerator: (req) => req.user?.userId || getClientIp(req),
  message: 'Profile update limit reached. Please wait before updating profile information again.'
});

module.exports = {
  createTransactionRateLimiter,
  resetAllTransactionRateLimits,
  passwordResetRequestLimiter,
  passwordResetVerifyLimiter,
  changePasswordLimiter,
  credentialVerifyLimiter,
  mfaSendLimiter,
  bulkImportLimiter,
  reportExportLimiter,
  evaluationSubmitLimiter,
  enrollmentApprovalLimiter,
  studentStatusUpdateLimiter,
  studentProfileUpdateLimiter
};
