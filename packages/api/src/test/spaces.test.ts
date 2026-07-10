import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';

const BASE = '/api/v1';

async function makeUser(username: string) {
  const res = await request(app).post(`${BASE}/auth/register`)
    .send({ username, password: 'Password1!' });
  return { token: res.body.access_token as string, userId: res.body.user.id as string };
}

describe('Spaces', () => {
  it('creates a space and returns it', async () => {
    const { token } = await makeUser('spuser1');
    const res = await request(app).post(`${BASE}/spaces`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Space' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('My Space');
    expect(res.body.id).toBeTruthy();
  });

  it('rejects empty space name', async () => {
    const { token } = await makeUser('spuser2');
    const res = await request(app).post(`${BASE}/spaces`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('lists spaces for authenticated user', async () => {
    const { token } = await makeUser('spuser3');
    await request(app).post(`${BASE}/spaces`).set('Authorization', `Bearer ${token}`).send({ name: 'Space A' });
    await request(app).post(`${BASE}/spaces`).set('Authorization', `Bearer ${token}`).send({ name: 'Space B' });
    const res = await request(app).get(`${BASE}/spaces`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('renames a space', async () => {
    const { token } = await makeUser('spuser4');
    const create = await request(app).post(`${BASE}/spaces`)
      .set('Authorization', `Bearer ${token}`).send({ name: 'Old Name' });
    const spaceId = create.body.id;
    const res = await request(app).patch(`${BASE}/spaces/${spaceId}`)
      .set('Authorization', `Bearer ${token}`).send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
  });

  it('non-member cannot access space channels', async () => {
    const { token: ownerToken } = await makeUser('spowner');
    const { token: otherToken } = await makeUser('spother');
    const create = await request(app).post(`${BASE}/spaces`)
      .set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Private Space' });
    const spaceId = create.body.id;
    const res = await request(app).get(`${BASE}/spaces/${spaceId}/channels`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  it('deletes a space (owner only)', async () => {
    const { token } = await makeUser('spdelete');
    const create = await request(app).post(`${BASE}/spaces`)
      .set('Authorization', `Bearer ${token}`).send({ name: 'Doomed Space' });
    const spaceId = create.body.id;
    const del = await request(app).delete(`${BASE}/spaces/${spaceId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);
    const get = await request(app).get(`${BASE}/spaces/${spaceId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(404);
  });
});
