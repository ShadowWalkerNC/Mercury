import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';

const BASE = '/api/v1';

async function setup(username: string) {
  const reg = await request(app).post(`${BASE}/auth/register`).send({ username, password: 'Password1!' });
  const token = reg.body.access_token as string;
  const space = await request(app).post(`${BASE}/spaces`)
    .set('Authorization', `Bearer ${token}`).send({ name: 'Test Space' });
  return { token, spaceId: space.body.id as string };
}

describe('Channels', () => {
  it('creates a text channel', async () => {
    const { token, spaceId } = await setup('chuser1');
    const res = await request(app).post(`${BASE}/spaces/${spaceId}/channels`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'general', type: 'text' });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('text');
  });

  it('creates a voice channel', async () => {
    const { token, spaceId } = await setup('chuser2');
    const res = await request(app).post(`${BASE}/spaces/${spaceId}/channels`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'voice-general', type: 'voice' });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('voice');
  });

  it('rejects invalid channel name characters', async () => {
    const { token, spaceId } = await setup('chuser3');
    const res = await request(app).post(`${BASE}/spaces/${spaceId}/channels`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Channel!!', type: 'text' });
    expect(res.status).toBe(400);
  });

  it('lists channels for a space', async () => {
    const { token, spaceId } = await setup('chuser4');
    await request(app).post(`${BASE}/spaces/${spaceId}/channels`)
      .set('Authorization', `Bearer ${token}`).send({ name: 'chan-a', type: 'text' });
    await request(app).post(`${BASE}/spaces/${spaceId}/channels`)
      .set('Authorization', `Bearer ${token}`).send({ name: 'chan-b', type: 'text' });
    const res = await request(app).get(`${BASE}/spaces/${spaceId}/channels`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('deletes a channel', async () => {
    const { token, spaceId } = await setup('chuser5');
    const create = await request(app).post(`${BASE}/spaces/${spaceId}/channels`)
      .set('Authorization', `Bearer ${token}`).send({ name: 'to-delete', type: 'text' });
    const chanId = create.body.id;
    const del = await request(app).delete(`${BASE}/channels/${chanId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);
  });
});
