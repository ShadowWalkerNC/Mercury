import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';

const BASE = '/api/v1';

async function makeUser(username: string) {
  const res = await request(app).post(`${BASE}/auth/register`)
    .send({ username, password: 'Password1!' });
  return res.body.access_token as string;
}

describe('Direct Messages', () => {
  it('opens a DM between two users', async () => {
    const tokenA = await makeUser('dmalice');
    const tokenB = await makeUser('dmbob');
    const bobId  = (await request(app).get(`${BASE}/users/me`).set('Authorization', `Bearer ${tokenB}`)).body.id;

    const res = await request(app).post(`${BASE}/dms`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ recipient_id: bobId });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.recipient.username).toBe('dmbob');
  });

  it('opening same DM twice returns the same conversation', async () => {
    const tokenA = await makeUser('dmalice2');
    const tokenB = await makeUser('dmbob2');
    const bobId  = (await request(app).get(`${BASE}/users/me`).set('Authorization', `Bearer ${tokenB}`)).body.id;

    const first  = await request(app).post(`${BASE}/dms`).set('Authorization', `Bearer ${tokenA}`).send({ recipient_id: bobId });
    const second = await request(app).post(`${BASE}/dms`).set('Authorization', `Bearer ${tokenA}`).send({ recipient_id: bobId });
    expect(first.body.id).toBe(second.body.id);
  });
});
