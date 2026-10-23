const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth');
const {
  loginLimiter,
  signupLimiter,
  resendVerificationLimiter,
} = require('../middleware/rateLimit');

const router = express.Router();

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

// Protected routes
router.get('/me', authenticateToken, authController.me);
router.patch('/complete-profile', authenticateToken, authController.completeProfile);

module.exports = router;
