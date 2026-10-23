import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './helpers';

describe('CORS Middleware', () => {
  it('returns access-control-allow-origin for an allowed origin', async () => {
    const res = await request(app)
      .options('/api/v1/loans')
      .set('Origin', 'http://localhost:8081')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:8081',
    );
  });

  it('omits access-control-allow-origin for a disallowed origin without throwing', async () => {
    const optionsRes = await request(app)
      .options('/api/v1/loans')
      .set('Origin', 'http://evil.com')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');

    expect(optionsRes.headers['access-control-allow-origin']).toBeUndefined();

    const getRes = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'http://evil.com');

    expect(getRes.status).toBe(200);
    expect(getRes.headers['access-control-allow-origin']).toBeUndefined();
  });
});
