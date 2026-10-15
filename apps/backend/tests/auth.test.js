const request = require('supertest');
const app = require('../src/app');
const { setupTestDB } = require('./setup');

describe('Authentication API', () => {
  setupTestDB();

  const validUser = {
    phone: '+919876543210',
    name: 'Ananya Sharma',
    pin: '1234',
    emergencyNote: 'Allergic to penicillin'
  };

  describe('POST /auth/register', () => {
    it('successfully registers a user with valid phone and PIN', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.phone).toBe(validUser.phone);
      expect(res.body.data.user.name).toBe(validUser.name);
      expect(res.body.data.user.pin).toBeUndefined(); // Ensure hashed PIN is never returned
      expect(res.body.data.token).toBeDefined();
    });

    it('rejects registration with duplicate phone number', async () => {
      await request(app).post('/auth/register').send(validUser);

      const res = await request(app)
        .post('/auth/register')
        .send(validUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('already registered');
    });

    it('rejects malformed phone numbers', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          ...validUser,
          phone: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details).toBeDefined();
    });

    it('rejects PIN with fewer than 4 or non-numeric characters', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          ...validUser,
          pin: 'abc'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/auth/register').send(validUser);
    });

    it('successfully logs in with correct phone and PIN', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          phone: validUser.phone,
          pin: validUser.pin
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.phone).toBe(validUser.phone);
    });

    it('rejects login with incorrect PIN without disclosing user existence', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          phone: validUser.phone,
          pin: '9999'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid phone or PIN.');
    });

    it('rejects login with unregistered phone number with identical message', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          phone: '+919999999999',
          pin: '1234'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid phone or PIN.');
    });
  });

  describe('GET /auth/me (Protected Route)', () => {
    let token;

    beforeEach(async () => {
      const reg = await request(app).post('/auth/register').send(validUser);
      token = reg.body.data.token;
    });

    it('returns user profile when valid token is provided', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.phone).toBe(validUser.phone);
    });

    it('rejects access without Authorization header', async () => {
      const res = await request(app).get('/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects access with invalid token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid_token_123');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
