const { rateLimit } = require('express-rate-limit');

const DEFAULT_WINDOW_MS = 15 * 1000;
const DEFAULT_REQUEST_LIMIT = 20;

const createGlobalRateLimiter = ({
  windowMs = DEFAULT_WINDOW_MS,
  limit = DEFAULT_REQUEST_LIMIT
} = {}) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS' || req.path === '/api/health',
  handler: (req, res) => {
    const resetTime = req.rateLimit?.resetTime;
    const retryAfterSeconds = resetTime
      ? Math.max(1, Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000))
      : Math.ceil(windowMs / 1000);

    res.set('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please wait and try again.',
      retryAfterSeconds
    });
  }
});

const globalRateLimiter = createGlobalRateLimiter();

module.exports = globalRateLimiter;
module.exports.createGlobalRateLimiter = createGlobalRateLimiter;
module.exports.DEFAULT_WINDOW_MS = DEFAULT_WINDOW_MS;
module.exports.DEFAULT_REQUEST_LIMIT = DEFAULT_REQUEST_LIMIT;
