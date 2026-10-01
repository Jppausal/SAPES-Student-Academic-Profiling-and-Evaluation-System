const jwt = require('jsonwebtoken');
const SessionToken = require('../models/SessionToken');
const User = require('../models/User');
const Student = require('../models/Student');

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

    const [session, user, student] = await Promise.all([
      SessionToken.findOne({
        jti: req.user.jti,
        userId: req.user.userId,
        revokedAt: null,
        expiresAt: { $gt: new Date() }
      }).select('_id').lean(),
      User.findById(req.user.userId)
        .select('username role accountStatus')
        .lean(),
      Student.findById(req.user.userId)
        .select('username role accountStatus')
        .lean()
    ]);
    const account = user || student;

    if (!session) {
      return res.status(401).json({ success: false, message: 'Session is revoked or expired' });
    }

    if (!account) {
      return res.status(401).json({ success: false, message: 'Account no longer exists' });
    }

    if (account.accountStatus !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is not active' });
    }

    // Use current database values so role/account changes take effect immediately
    // instead of trusting claims captured when the JWT was issued.
    req.user.role = account.role;
    req.user.username = account.username;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

module.exports = authenticateToken;
