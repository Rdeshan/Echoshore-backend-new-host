const jwt = require('jsonwebtoken');

const auth = (roles = []) => {
  return (req, res, next) => {
    // 1. Get token
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.replace('Bearer ', '');

    if (!token) {
      return res
        .status(401)
        .json({ error: 'Access Denied. No token provided.' });
    }

    try {
      // 2. Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'supersecretkey_changeme'
      );

      req.user = decoded;
      req.token = token;

      // 3. Role check (RBAC)
      if (roles.length > 0) {
        const userRole = decoded.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(userRole)) {
          return res
            .status(403)
            .json({ error: 'Access Denied. Insufficient permissions.' });
        }
      }

      next();
    } catch (err) {
      return res.status(400).json({ error: 'Invalid Token' });
    }
  };
};

module.exports = auth;
