const express = require('express');
const authController = require('../controllers/auth.controller');
const { checkMailStatusLive } = require('../utils/mailer');
const { authenticateToken } = require('../middleware/auth');
const {
  loginLimiter,
  signupLimiter,
  resendVerificationLimiter,
} = require('../middleware/rateLimit');

const router = express.Router();

// Request logger for /api/auth/* (method, path, status, duration only, no body)
router.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[AUTH-LOG] ${req.method} ${req.originalUrl || req.baseUrl + req.path} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Public routes
router.post('/signup', signupLimiter, authController.signup);
router.post('/register', signupLimiter, authController.signup); // Backward compatibility
router.get('/verify-email', authController.verifyEmail);
router.get('/verification-status', authController.getVerificationStatus);
router.post('/resend-verification', resendVerificationLimiter, authController.resendVerification);

router.post('/login', loginLimiter, authController.login);
router.post('/google', loginLimiter, authController.googleAuth);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Diagnostic route (temporary, protected by DEBUG_SECRET)
router.get('/debug/mail-status', async (req, res) => {
  const serverSecret = (process.env.DEBUG_SECRET || '').trim();
  const clientSecret = (req.headers['x-debug-secret'] || '').toString().trim();

  if (!serverSecret || clientSecret !== serverSecret) {
    return res.status(403).json({
      error: 'Diagnostic route disabled or unauthorized. Set DEBUG_SECRET env var and pass x-debug-secret header.',
    });
  }

  try {
    const status = await checkMailStatusLive();
    return res.status(200).json({
      configured: Boolean(status.configured),
      verified: Boolean(status.verified),
      provider: status.provider || 'unknown',
      errorCode: status.errorCode || null,
      errorMessage: status.errorMessage || null,
    });
  } catch (err) {
    return res.status(200).json({
      configured: true,
      verified: false,
      errorCode: err.code || 'EUNKNOWN',
      errorMessage: err.message,
    });
  }
});

// Protected routes
router.get('/me', authenticateToken, authController.me);
router.patch('/complete-profile', authenticateToken, authController.completeProfile);

module.exports = router;
