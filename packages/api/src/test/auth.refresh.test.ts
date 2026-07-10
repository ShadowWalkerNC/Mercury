import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';

const BASE = '/api/v1';

describe('Token refresh', () => {
  it('exchanges a valid refresh token for new tokens', async () => {
    const reg = await request(app).post(`${BASE}/auth/register`)
      .send({ username: 'rfuser1', password: 'Password1!' });
    const refreshToken = reg.body.refresh_token as string;

    const res = await request(app).post(`${BASE}/auth/refresh`)
      .send({ refresh_token: refreshToken });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');
    // new refresh token should differ (rotation)
    expect(res.body.refresh_token).not.toBe(refreshToken);
  });

  it('rejects an invalid refresh token', async () => {
    const res = await request(app).post(`${BASE}/auth/refresh`)
      .send({ refresh_token: 'not-a-real-token' });
    expect(res.status).toBe(401);
  });

  it('rejects a reused refresh token (rotation invalidation)', async () => {
    const reg = await request(app).post(`${BASE}/auth/register`)
      .send({ username: 'rfuser2', password: 'Password1!' });
    const original = reg.body.refresh_token as string;
    // use it once
    await request(app).post(`${BASE}/auth/refresh`).send({ refresh_token: original });
    // try to use it again
    const res = await request(app).post(`${BASE}/auth/refresh`).send({ refresh_token: original });
    expect(res.status).toBe(401);
  });
});
