const express = require('express');
const authController = require('./auth.controller');
const { registerSchema, loginSchema } = require('./auth.validation');
const validate = require('../../../middleware/validate.middleware');
const { authLimiter } = require('../../../middleware/rateLimiter.middleware');
const { requireAuth } = require('../../../middleware/auth.middleware');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.get('/me', requireAuth, authController.me);

module.exports = router;
