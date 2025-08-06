const User = require('../models/User');

const roleMiddleware = (roles) => async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = roleMiddleware;