const request = require('supertest');
const app = require('../src/app');
const { setupTestDB } = require('./setup');

describe('Health Check API', () => {
  setupTestDB();

  it('GET /health - returns healthy status and uptime', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('safesafar-backend-core');
    expect(res.body.database.status).toBe('connected');
    expect(res.body.uptime).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /non-existent-route - returns standardized 404', async () => {
    const res = await request(app).get('/random-path-not-found');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Endpoint not found');
  });
});
