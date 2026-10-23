const { verifyAccessToken } = require('../utils/tokens');
const User = require('../models/User');

/**
 * Express middleware to authenticate requests using JWT Access Token
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Missing or malformed Bearer token.',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Token is missing.',
      });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          code: 'TOKEN_EXPIRED',
          error: 'Access token expired. Please refresh token.',
        });
      }
      return res.status(401).json({
        success: false,
        code: 'TOKEN_INVALID',
        error: 'Invalid authentication token.',
      });
    }

    const user = await User.findById(decoded.userId).lean();
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User associated with this token no longer exists.',
      });
    }

    req.user = {
      _id: user._id.toString(),
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      authProvider: user.authProvider,
      avatar: user.avatar,
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal authentication error',
    });
  }
}

/**
 * Socket.IO middleware to authenticate connection handshakes
 */
async function socketAuthMiddleware(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      // In demo mode or public tracking, allow connection with guest/read-only access
      socket.user = null;
      return next();
    }

    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).lean();
      if (user) {
        socket.user = {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
        };
      }
    } catch (err) {
      console.warn('[SocketAuth] Non-fatal invalid token in handshake:', err.message);
      socket.user = null;
    }

    return next();
  } catch (error) {
    return next(new Error('Socket authentication error'));
  }
}

module.exports = {
  authenticateToken,
  requireAuth: authenticateToken, // Alias for backward compatibility
  socketAuthMiddleware,
};
