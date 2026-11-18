const { rateLimit } = require('express-rate-limit');

const WINDOW_MS = 15 * 60 * 1000;

const createRateLimiter = (limit) => rateLimit({
  windowMs: WINDOW_MS,
  limit,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  },
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  }
});

module.exports = {
  createRateLimiter,
  apiRateLimiter: createRateLimiter(300),
  loginRateLimiter: createRateLimiter(10),
  passwordResetRequestRateLimiter: createRateLimiter(5),
  passwordResetRateLimiter: createRateLimiter(10),
  googleAuthRateLimiter: createRateLimiter(10)
};
