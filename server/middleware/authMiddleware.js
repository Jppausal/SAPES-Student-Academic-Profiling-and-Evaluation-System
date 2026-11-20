const jwt = require('jsonwebtoken');

const ROLES = new Set(['admin', 'faculty', 'student']);

const authenticateToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  const [scheme, token, ...extraParts] = authorization
    ? authorization.trim().split(/\s+/)
    : [];

  if (
    scheme?.toLowerCase() !== 'bearer' ||
    !token ||
    extraParts.length > 0
  ) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (
      !payload
      || payload.tokenType !== 'access'
      || typeof payload.userId !== 'string'
      || !payload.userId
      || !ROLES.has(payload.role)
    ) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

module.exports = authenticateToken;
