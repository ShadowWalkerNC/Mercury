import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';

const BASE = '/api/v1';

describe('POST /auth/register', () => {
  it('creates a user and returns tokens', async () => {
    const res = await request(app).post(`${BASE}/auth/register`).send({
      username: 'alice',
      password: 'Password1!',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');
    expect(res.body.user.username).toBe('alice');
  });

  it('rejects duplicate username', async () => {
    await request(app).post(`${BASE}/auth/register`).send({ username: 'bob', password: 'Password1!' });
    const res = await request(app).post(`${BASE}/auth/register`).send({ username: 'bob', password: 'Password1!' });
    expect(res.status).toBe(409);
  });

  it('rejects invalid username (too short)', async () => {
    const res = await request(app).post(`${BASE}/auth/register`).send({ username: 'x', password: 'Password1!' });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('username');
  });

  it('rejects weak password', async () => {
    const res = await request(app).post(`${BASE}/auth/register`).send({ username: 'charlie', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('password');
  });
});

describe('POST /auth/login', () => {
  async function registerUser(username = 'dave', password = 'Password1!') {
    await request(app).post(`${BASE}/auth/register`).send({ username, password });
  }

  it('returns tokens for valid credentials', async () => {
    await registerUser();
    const res = await request(app).post(`${BASE}/auth/login`).send({ username: 'dave', password: 'Password1!' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
  });

  it('rejects wrong password', async () => {
    await registerUser();
    const res = await request(app).post(`${BASE}/auth/login`).send({ username: 'dave', password: 'WrongPass1!' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown user', async () => {
    const res = await request(app).post(`${BASE}/auth/login`).send({ username: 'ghost', password: 'Password1!' });
    expect(res.status).toBe(401);
  });
});
