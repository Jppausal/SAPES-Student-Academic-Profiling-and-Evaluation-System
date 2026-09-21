const jwt = require('jsonwebtoken');

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
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

module.exports = authenticateToken;