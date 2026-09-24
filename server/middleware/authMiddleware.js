const jwt = require('jsonwebtoken');
const SessionToken = require('../models/SessionToken');

const authenticateToken = async (req, res, next) => {
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
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    if (!req.user.jti) {
      return res.status(401).json({ success: false, message: 'Session must be renewed' });
    }

    const session = await SessionToken.findOne({
      jti: req.user.jti,
      userId: req.user.userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    }).select('_id').lean();
    if (!session) {
      return res.status(401).json({ success: false, message: 'Session is revoked or expired' });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

module.exports = authenticateToken;