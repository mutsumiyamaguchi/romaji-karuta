import { describe, it, expect } from 'vitest';
import { getPoints, addPoints } from '../../functions/_lib/handlers/points.js';
import { createD1Mock, makeRequest } from '../helpers/d1Mock.js';

function makeEnv(extra = {}) {
  return {
    PIN_SALT: 'test-salt',
    DB: createD1Mock(extra),
  };
}

describe('GET /api/students/:id/points', () => {
  it('returns current points', async () => {
    const env = makeEnv({
      students: [{ id: 's1', name: 'Alice', points: 42, created_at: '2026-05-01' }],
    });
    const res = await getPoints({ env, params: { id: 's1' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ id: 's1', points: 42 });
  });

  it('returns 404 when student missing', async () => {
    const env = makeEnv();
    const res = await getPoints({ env, params: { id: 'missing' } });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/students/:id/points', () => {
  it('adds delta to existing points', async () => {
    const env = makeEnv({
      students: [{ id: 's1', name: 'Alice', points: 10, created_at: '2026-05-01' }],
    });
    const request = makeRequest('http://localhost/api/students/s1/points', {
      method: 'POST',
      body: { delta: 25 },
    });
    const res = await addPoints({ request, env, params: { id: 's1' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.points).toBe(35);
    expect(env.DB._state.students[0].points).toBe(35);
  });

  it('rejects non-number delta', async () => {
    const env = makeEnv({
      students: [{ id: 's1', name: 'Alice', points: 10, created_at: '2026-05-01' }],
    });
    const request = makeRequest('http://localhost/api/students/s1/points', {
      method: 'POST',
      body: { delta: 'oops' },
    });
    const res = await addPoints({ request, env, params: { id: 's1' } });
    expect(res.status).toBe(400);
  });

  it('returns 404 when student missing', async () => {
    const env = makeEnv();
    const request = makeRequest('http://localhost/api/students/missing/points', {
      method: 'POST',
      body: { delta: 10 },
    });
    const res = await addPoints({
      request,
      env,
      params: { id: 'missing' },
    });
    expect(res.status).toBe(404);
  });
});
