const jwt = require('jsonwebtoken');

exports.generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
      assignedBeach: user.assignedBeach ? user.assignedBeach.toString() : null,
    },
    process.env.JWT_SECRET || 'supersecretkey_changeme',
    { expiresIn: '1d' }
  );
};
