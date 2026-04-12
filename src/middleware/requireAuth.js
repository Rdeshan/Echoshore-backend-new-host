const jwt = require('jsonwebtoken');

/**
 * Authentication middleware (SOLID - Single Responsibility)
 * Only verifies JWT token and attaches user to request
 * Does NOT check roles - that's the job of authorizeRoles middleware
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access Denied. No token provided.',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'supersecretkey_changeme'
    );

    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

module.exports = requireAuth;
