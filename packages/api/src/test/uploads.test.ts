import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';

const BASE = '/api/v1';

async function makeToken(username: string) {
  const res = await request(app).post(`${BASE}/auth/register`).send({ username, password: 'Password1!' });
  return res.body.access_token as string;
}

describe('Upload presign', () => {
  it('returns a presigned URL and key for a valid extension', async () => {
    const token = await makeToken('upuser1');
    const res = await request(app)
      .get(`${BASE}/uploads/presign?ext=png&mime=image/png`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('url');
    expect(res.body).toHaveProperty('key');
    expect(res.body.url).toMatch(/^https?:\/\//); // presigned URL
  });

  it('rejects an unauthenticated presign request', async () => {
    const res = await request(app).get(`${BASE}/uploads/presign?ext=png&mime=image/png`);
    expect(res.status).toBe(401);
  });

  it('rejects a disallowed extension', async () => {
    const token = await makeToken('upuser2');
    const res = await request(app)
      .get(`${BASE}/uploads/presign?ext=exe&mime=application/octet-stream`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('message with attachment metadata is saved', async () => {
    const token = await makeToken('upuser3');
    const space = await request(app).post(`${BASE}/spaces`).set('Authorization', `Bearer ${token}`).send({ name: 'S' });
    const chan  = await request(app).post(`${BASE}/spaces/${space.body.id}/channels`).set('Authorization', `Bearer ${token}`).send({ name: 'general', type: 'text' });
    const res = await request(app).post(`${BASE}/channels/${chan.body.id}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        content: '',
        attachment: {
          key:  'uploads/test-key.png',
          url:  'https://s3.example.com/test-key.png',
          name: 'test.png',
          size: 12345,
          mime: 'image/png',
        },
      });
    expect(res.status).toBe(201);
    expect(res.body.attachment).toBeTruthy();
    expect(res.body.attachment.name).toBe('test.png');
  });
});
