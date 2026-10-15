const jwt = require('jsonwebtoken');
const SessionToken = require('../models/SessionToken');
const { getAccountModel } = require('../utils/accountCollections');

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
    const AccountModel = getAccountModel(req.user.role);
    if (!req.user.jti || !AccountModel) {
      return res.status(401).json({ success: false, message: 'Session must be renewed' });
    }

    const [session, account] = await Promise.all([
      SessionToken.findOne({
        jti: req.user.jti,
        userId: req.user.userId,
        accountRole: req.user.role,
        revokedAt: null,
        expiresAt: { $gt: new Date() }
      }).select('_id').lean(),
      AccountModel.findById(req.user.userId)
        .select('username role accountStatus')
        .lean(),
    ]);

    if (!session) {
      return res.status(401).json({ success: false, message: 'Session is revoked or expired' });
    }

    if (!account) {
      return res.status(401).json({ success: false, message: 'Account no longer exists' });
    }

    if (account.role !== req.user.role) {
      return res.status(401).json({ success: false, message: 'Account role no longer matches this session' });
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
