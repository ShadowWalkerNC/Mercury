import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';

const BASE = '/api/v1';

async function setup(username: string) {
  const reg   = await request(app).post(`${BASE}/auth/register`).send({ username, password: 'Password1!' });
  const token = reg.body.access_token as string;
  const space = await request(app).post(`${BASE}/spaces`).set('Authorization', `Bearer ${token}`).send({ name: 'S' });
  const chan  = await request(app).post(`${BASE}/spaces/${space.body.id}/channels`).set('Authorization', `Bearer ${token}`).send({ name: 'general', type: 'text' });
  const msg   = await request(app).post(`${BASE}/channels/${chan.body.id}/messages`).set('Authorization', `Bearer ${token}`).send({ content: 'Hello' });
  return { token, channelId: chan.body.id as string, msgId: msg.body.id as string };
}

describe('Reactions', () => {
  it('adds a reaction', async () => {
    const { token, msgId } = await setup('rxuser1');
    const res = await request(app).post(`${BASE}/messages/${msgId}/reactions`)
      .set('Authorization', `Bearer ${token}`).send({ emoji: '👍' });
    expect(res.status).toBe(200);
  });

  it('toggle: adding same emoji twice removes it', async () => {
    const { token, channelId, msgId } = await setup('rxuser2');
    await request(app).post(`${BASE}/messages/${msgId}/reactions`).set('Authorization', `Bearer ${token}`).send({ emoji: '❤️' });
    await request(app).post(`${BASE}/messages/${msgId}/reactions`).set('Authorization', `Bearer ${token}`).send({ emoji: '❤️' });
    const list = await request(app).get(`${BASE}/channels/${channelId}/messages`).set('Authorization', `Bearer ${token}`);
    const reactions = list.body[0]?.reactions ?? [];
    const heart = reactions.find((r: { emoji: string }) => r.emoji === '❤️');
    expect(heart?.count ?? 0).toBe(0);
  });

  it('two different users both react — count is 2', async () => {
    const { token: t1, channelId, msgId } = await setup('rxuser3a');
    const reg2 = await request(app).post(`${BASE}/auth/register`).send({ username: 'rxuser3b', password: 'Password1!' });
    const t2   = reg2.body.access_token as string;
    // invite user2 to the space (or join via invite — depends on API; skip join if open)
    await request(app).post(`${BASE}/messages/${msgId}/reactions`).set('Authorization', `Bearer ${t1}`).send({ emoji: '🔥' });
    await request(app).post(`${BASE}/messages/${msgId}/reactions`).set('Authorization', `Bearer ${t2}`).send({ emoji: '🔥' });
    const list = await request(app).get(`${BASE}/channels/${channelId}/messages`).set('Authorization', `Bearer ${t1}`);
    const fire = (list.body[0]?.reactions ?? []).find((r: { emoji: string }) => r.emoji === '🔥');
    expect(fire?.count).toBe(2);
  });

  it('rejects empty emoji', async () => {
    const { token, msgId } = await setup('rxuser4');
    const res = await request(app).post(`${BASE}/messages/${msgId}/reactions`)
      .set('Authorization', `Bearer ${token}`).send({ emoji: '' });
    expect(res.status).toBe(400);
  });

  it('rejects emoji longer than 10 chars', async () => {
    const { token, msgId } = await setup('rxuser5');
    const res = await request(app).post(`${BASE}/messages/${msgId}/reactions`)
      .set('Authorization', `Bearer ${token}`).send({ emoji: '🔥'.repeat(11) });
    expect(res.status).toBe(400);
  });
});
