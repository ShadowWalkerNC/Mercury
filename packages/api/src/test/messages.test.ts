import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';

const BASE = '/api/v1';

async function setup() {
  const reg = await request(app).post(`${BASE}/auth/register`)
    .send({ username: 'msguser', password: 'Password1!' });
  const token = reg.body.access_token as string;

  const space = await request(app).post(`${BASE}/spaces`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Space' });
  const spaceId = space.body.id as string;

  const chan = await request(app).post(`${BASE}/spaces/${spaceId}/channels`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'general', type: 'text' });
  const channelId = chan.body.id as string;

  return { token, spaceId, channelId };
}

describe('Messages', () => {
  it('sends a message and retrieves it', async () => {
    const { token, channelId } = await setup();
    const send = await request(app).post(`${BASE}/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Hello world' });
    expect(send.status).toBe(201);
    expect(send.body.content).toBe('Hello world');

    const list = await request(app).get(`${BASE}/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.length).toBe(1);
  });

  it('rejects empty message with no attachment', async () => {
    const { token, channelId } = await setup();
    const res = await request(app).post(`${BASE}/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '   ' });
    expect(res.status).toBe(400);
  });

  it('edits own message', async () => {
    const { token, channelId } = await setup();
    const send = await request(app).post(`${BASE}/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${token}`).send({ content: 'Original' });
    const msgId = send.body.id;

    const edit = await request(app).patch(`${BASE}/messages/${msgId}`)
      .set('Authorization', `Bearer ${token}`).send({ content: 'Edited' });
    expect(edit.status).toBe(200);
    expect(edit.body.content).toBe('Edited');
    expect(edit.body.edited_at).not.toBeNull();
  });

  it('deletes own message', async () => {
    const { token, channelId } = await setup();
    const send = await request(app).post(`${BASE}/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${token}`).send({ content: 'Bye' });
    const msgId = send.body.id;

    const del = await request(app).delete(`${BASE}/messages/${msgId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const list = await request(app).get(`${BASE}/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.length).toBe(0);
  });

  it('reaction toggle is idempotent (add twice = count 1)', async () => {
    const { token, channelId } = await setup();
    const send = await request(app).post(`${BASE}/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${token}`).send({ content: 'React!' });
    const msgId = send.body.id;

    await request(app).post(`${BASE}/messages/${msgId}/reactions`)
      .set('Authorization', `Bearer ${token}`).send({ emoji: '👍' });
    await request(app).post(`${BASE}/messages/${msgId}/reactions`)
      .set('Authorization', `Bearer ${token}`).send({ emoji: '👍' });

    const list = await request(app).get(`${BASE}/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${token}`);
    const reactions = list.body[0].reactions ?? [];
    const thumbs = reactions.find((r: { emoji: string }) => r.emoji === '👍');
    expect(thumbs?.count).toBe(1);
  });
});
