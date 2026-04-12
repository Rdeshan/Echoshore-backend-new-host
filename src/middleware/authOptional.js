const jwt = require('jsonwebtoken');

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't reject if missing
 * Used for endpoints that change behavior based on authentication status
 */
const authOptional = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.replace('Bearer ', '');

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'supersecretkey_changeme'
    );
    req.user = decoded;
    req.token = token;
  } catch (err) {
    // Token invalid, treat as guest
    req.user = null;
  }

  next();
};

module.exports = authOptional;
