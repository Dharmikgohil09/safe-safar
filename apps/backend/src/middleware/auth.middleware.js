const { verifyAccessToken } = require('../utils/tokens');
const User = require('../models/user.model');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Missing or malformed Bearer token.'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Token is missing.'
      });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Authentication failed. Token has expired.'
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Authentication failed. Token is invalid.'
      });
    }

    const user = await User.findById(decoded.userId).lean();
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User associated with this token no longer exists.'
      });
    }

    req.user = {
      _id: user._id.toString(),
      id: user._id.toString(),
      phone: user.phone,
      name: user.name,
      email: user.email
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal authentication error'
    });
  }
};

module.exports = {
  requireAuth
};
