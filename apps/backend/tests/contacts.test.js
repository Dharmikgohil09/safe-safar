const request = require('supertest');
const app = require('../src/app');
const { setupTestDB } = require('./setup');

describe('Trusted Contacts API', () => {
  setupTestDB();

  let userAToken;
  let userBToken;

  beforeEach(async () => {
    // Register User A
    const resA = await request(app).post('/auth/register').send({
      phone: '+919876543210',
      name: 'User A',
      pin: '1234'
    });
    userAToken = resA.body.data.token;

    // Register User B
    const resB = await request(app).post('/auth/register').send({
      phone: '+919876543211',
      name: 'User B',
      pin: '5678'
    });
    userBToken = resB.body.data.token;
  });

  describe('POST /contacts', () => {
    it('creates a new contact for authenticated user', async () => {
      const res = await request(app)
        .post('/contacts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Dad',
          phone: '+919876543220',
          telegramToken: 'secret_token_123'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Dad');
      expect(res.body.data.phone).toBe('+919876543220');
      // Verify sensitive token is not leaked
      expect(res.body.data.telegramToken).toBeUndefined();
    });

    it('rejects adding duplicate contact phone for the same user', async () => {
      await request(app)
        .post('/contacts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Dad', phone: '+919876543220' });

      const res = await request(app)
        .post('/contacts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Dad Work', phone: '+919876543220' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('enforces maximum contact limit of 5 per user', async () => {
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post('/contacts')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ name: `Contact ${i}`, phone: `+9198765432${i}0` });
      }

      // Attempt 6th contact
      const res = await request(app)
        .post('/contacts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Contact 6', phone: '+919876543299' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Maximum limit of 5 trusted contacts');
    });
  });

  describe('GET /contacts', () => {
    it('returns only contacts belonging to the authenticated user', async () => {
      // User A adds contact
      await request(app)
        .post('/contacts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Contact A1', phone: '+919876543201' });

      // User B adds contact
      await request(app)
        .post('/contacts')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ name: 'Contact B1', phone: '+919876543202' });

      // User A fetches contacts
      const resA = await request(app)
        .get('/contacts')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(resA.status).toBe(200);
      expect(resA.body.data.length).toBe(1);
      expect(resA.body.data[0].name).toBe('Contact A1');

      // User B fetches contacts
      const resB = await request(app)
        .get('/contacts')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(resB.status).toBe(200);
      expect(resB.body.data.length).toBe(1);
      expect(resB.body.data[0].name).toBe('Contact B1');
    });
  });

  describe('DELETE /contacts/:id', () => {
    let contactAId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/contacts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'To Delete', phone: '+919876543299' });
      contactAId = res.body.data._id;
    });

    it('allows user to delete their own contact', async () => {
      const res = await request(app)
        .delete(`/contacts/${contactAId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const listRes = await request(app)
        .get('/contacts')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(listRes.body.data.length).toBe(0);
    });

    it('prevents another user from deleting contact (cross-user authorization)', async () => {
      const res = await request(app)
        .delete(`/contacts/${contactAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Unauthorized');
    });
  });
});
