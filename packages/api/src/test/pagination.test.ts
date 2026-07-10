import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';

const BASE = '/api/v1';

async function setup(username: string) {
  const reg   = await request(app).post(`${BASE}/auth/register`).send({ username, password: 'Password1!' });
  const token = reg.body.access_token as string;
  const space = await request(app).post(`${BASE}/spaces`).set('Authorization', `Bearer ${token}`).send({ name: 'S' });
  const chan  = await request(app).post(`${BASE}/spaces/${space.body.id}/channels`).set('Authorization', `Bearer ${token}`).send({ name: 'general', type: 'text' });
  return { token, channelId: chan.body.id as string };
}

describe('Message pagination', () => {
  it('returns default limit of 50 messages', async () => {
    const { token, channelId } = await setup('pguser1');
    // send 60 messages
    for (let i = 0; i < 60; i++) {
      await request(app).post(`${BASE}/channels/${channelId}/messages`)
        .set('Authorization', `Bearer ${token}`).send({ content: `msg ${i}` });
    }
    const res = await request(app).get(`${BASE}/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(50);
  });

  it('supports ?limit param', async () => {
    const { token, channelId } = await setup('pguser2');
    for (let i = 0; i < 10; i++) {
      await request(app).post(`${BASE}/channels/${channelId}/messages`)
        .set('Authorization', `Bearer ${token}`).send({ content: `msg ${i}` });
    }
    const res = await request(app).get(`${BASE}/channels/${channelId}/messages?limit=5`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(5);
  });

  it('supports ?before cursor for older messages', async () => {
    const { token, channelId } = await setup('pguser3');
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await request(app).post(`${BASE}/channels/${channelId}/messages`)
        .set('Authorization', `Bearer ${token}`).send({ content: `msg ${i}` });
      ids.push(r.body.id);
    }
    // fetch messages before the last one
    const pivot = ids[ids.length - 1];
    const res = await request(app)
      .get(`${BASE}/channels/${channelId}/messages?before=${pivot}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const returnedIds = res.body.map((m: { id: string }) => m.id);
    expect(returnedIds).not.toContain(pivot);
    expect(returnedIds.length).toBe(4);
  });
});
