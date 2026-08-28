const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health', () => {
  it('returns ok status without authentication', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('Protected routes', () => {
  it('rejects requests without a bearer token', async () => {
    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(401);
  });
});
