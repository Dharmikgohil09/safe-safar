const request = require('supertest');
const app = require('../src/app');
const { setupTestDB } = require('./setup');
const User = require('../src/models/User');
const { hashToken } = require('../src/utils/tokens');

describe('SafeSafar Complete Authentication API', () => {
  setupTestDB();

  const validUser = {
    name: 'Ananya Sharma',
    email: 'ananya.sharma@example.com',
    phone: '9876543210',
    password: '1234',
  };

  describe('POST /api/auth/signup', () => {
    it('successfully registers an unverified user and sets 24h verification token', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.email).toBe(validUser.email);
      expect(res.body.requiresVerification).toBe(true);

      const dbUser = await User.findOne({ email: validUser.email }).select('+passwordHash +emailVerificationTokenHash');
      expect(dbUser).toBeDefined();
      expect(dbUser.isEmailVerified).toBe(false);
      expect(dbUser.emailVerificationTokenHash).toBeDefined();
      expect(dbUser.passwordHash).not.toBe(validUser.password); // Bcrypt hashed
    });

    it('rejects invalid 4-digit PIN', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ ...validUser, password: '12' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.field).toBe('password');
    });

    it('rejects invalid Indian phone number', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ ...validUser, phone: '12345' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.field).toBe('phone');
    });

    it('updates details and resends email if user signs up again while pending/unverified', async () => {
      await request(app).post('/api/auth/signup').send(validUser);

      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          ...validUser,
          name: 'Ananya S. Updated',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const updated = await User.findOne({ email: validUser.email });
      expect(updated.name).toBe('Ananya S. Updated');
    });
  });

  describe('GET /api/auth/verify-email', () => {
    it('verifies email and marks user verified with deep link HTML response', async () => {
      await request(app).post('/api/auth/signup').send(validUser);

      // Extract raw token from db simulation
      const user = await User.findOne({ email: validUser.email }).select('+emailVerificationTokenHash');
      const rawToken = 'test_raw_verification_token_32_bytes_sample';
      user.emailVerificationTokenHash = hashToken(rawToken);
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();

      const res = await request(app)
        .get(`/api/auth/verify-email?token=${rawToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain('Email Verified!');
      expect(res.text).toContain('safesafar://verified');

      const verifiedUser = await User.findOne({ email: validUser.email });
      expect(verifiedUser.isEmailVerified).toBe(true);
    });

    it('returns error page for expired or invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/verify-email?token=non_existent_invalid_token');

      expect(res.status).toBe(400);
      expect(res.text).toContain('Expired or Invalid Link');
    });
  });

  describe('GET /api/auth/verification-status', () => {
    it('returns verified: false when user has not yet verified email', async () => {
      await request(app).post('/api/auth/signup').send(validUser);

      const res = await request(app)
        .get(`/api/auth/verification-status?email=${validUser.email}`);

      expect(res.status).toBe(200);
      expect(res.body.verified).toBe(false);
    });

    it('returns verified: true and auto-login tokens once email is verified', async () => {
      await request(app).post('/api/auth/signup').send(validUser);
      await User.updateOne({ email: validUser.email }, { isEmailVerified: true });

      const res = await request(app)
        .get(`/api/auth/verification-status?email=${validUser.email}`);

      expect(res.status).toBe(200);
      expect(res.body.verified).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe(validUser.email);
    });
  });

  describe('POST /api/auth/login', () => {
    it('rejects login if email is not verified', async () => {
      await request(app).post('/api/auth/signup').send(validUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: validUser.email,
          password: validUser.password,
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('successfully logs in with verified email and returns accessToken and refreshToken', async () => {
      await request(app).post('/api/auth/signup').send(validUser);
      await User.updateOne({ email: validUser.email }, { isEmailVerified: true });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: validUser.email,
          password: validUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe(validUser.email);
    });

    it('successfully logs in using phone number as identifier', async () => {
      await request(app).post('/api/auth/signup').send(validUser);
      await User.updateOne({ email: validUser.email }, { isEmailVerified: true });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: '+919876543210',
          password: validUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
    });

    it('rejects invalid PIN with generic error', async () => {
      await request(app).post('/api/auth/signup').send(validUser);
      await User.updateOne({ email: validUser.email }, { isEmailVerified: true });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: validUser.email,
          password: '9999',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials.');
    });

    it('locks account for 15 minutes after 5 consecutive failed attempts', async () => {
      await request(app).post('/api/auth/signup').send(validUser);
      await User.updateOne({ email: validUser.email }, { isEmailVerified: true });

      for (let i = 0; i < 4; i++) {
        await request(app).post('/api/auth/login').send({
          identifier: validUser.email,
          password: '0000',
        });
      }

      // 5th failed attempt locks the account
      const res5 = await request(app).post('/api/auth/login').send({
        identifier: validUser.email,
        password: '0000',
      });
      expect(res5.status).toBe(423);
      expect(res5.body.error).toContain('locked for 15 minutes');

      // Subsequent attempt even with correct password is locked
      const resLocked = await request(app).post('/api/auth/login').send({
        identifier: validUser.email,
        password: validUser.password,
      });
      expect(resLocked.status).toBe(423);
    });
  });

  describe('POST /api/auth/refresh & POST /api/auth/logout', () => {
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
      await request(app).post('/api/auth/signup').send(validUser);
      await User.updateOne({ email: validUser.email }, { isEmailVerified: true });

      const loginRes = await request(app).post('/api/auth/login').send({
        identifier: validUser.email,
        password: validUser.password,
      });

      accessToken = loginRes.body.accessToken;
      refreshToken = loginRes.body.refreshToken;
    });

    it('rotates refresh token and returns new tokens', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.refreshToken).not.toBe(refreshToken);
    });

    it('GET /api/auth/me returns current user profile with valid access token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(validUser.email);
    });

    it('POST /api/auth/logout invalidates refresh token', async () => {
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(logoutRes.status).toBe(200);

      // Refreshing with invalidated token should now fail
      const refreshFail = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshFail.status).toBe(401);
    });
  });

  describe('PATCH /api/auth/complete-profile', () => {
    it('allows Google user without phone to attach valid 10-digit phone', async () => {
      const googleUser = await User.create({
        name: 'Google User',
        email: 'google.user@example.com',
        authProvider: 'google',
        isEmailVerified: true,
      });

      const { generateAccessToken } = require('../src/utils/tokens');
      const token = generateAccessToken(googleUser);

      const res = await request(app)
        .patch('/api/auth/complete-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '+919123456789' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.phone).toBe('9123456789');
    });
  });
});
