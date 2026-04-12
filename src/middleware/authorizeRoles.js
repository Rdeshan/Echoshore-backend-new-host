/**
 * Role authorization middleware (SOLID - Single Responsibility)
 * Assumes req.user is already set by requireAuth middleware
 * Checks if user has one of the allowed roles
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `This action requires one of: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

module.exports = authorizeRoles;
