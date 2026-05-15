import { describe, it, expect } from 'vitest';
import {
  listMistakes,
  recordMistake,
} from '../../functions/_lib/handlers/mistakes.js';
import { createD1Mock, makeRequest } from '../helpers/d1Mock.js';

function makeEnv(extra = {}) {
  return {
    PIN_SALT: 'test-salt',
    DB: createD1Mock(extra),
  };
}

describe('GET /api/students/:id/mistakes', () => {
  it('returns mistakes sorted by count desc', async () => {
    const env = makeEnv({
      students: [{ id: 's1', name: 'Alice', points: 0, created_at: '2026-05-01' }],
      mistakes: [
        { id: 1, student_id: 's1', character: 'あ', mode: 'h2r', count: 2, last_at: '2026-05-02' },
        { id: 2, student_id: 's1', character: 'い', mode: 'h2r', count: 5, last_at: '2026-05-03' },
      ],
    });
    const res = await listMistakes({ env, params: { id: 's1' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mistakes.map((m) => m.character)).toEqual(['い', 'あ']);
  });
});

describe('POST /api/students/:id/mistakes', () => {
  it('creates a new mistake', async () => {
    const env = makeEnv({
      students: [{ id: 's1', name: 'Alice', points: 0, created_at: '2026-05-01' }],
    });
    const request = makeRequest('http://localhost/api/students/s1/mistakes', {
      method: 'POST',
      body: { character: 'あ', mode: 'h2r' },
    });
    const res = await recordMistake({ request, env, params: { id: 's1' } });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.mistake.character).toBe('あ');
    expect(body.mistake.count).toBe(1);
    expect(env.DB._state.mistakes).toHaveLength(1);
  });

  it('increments count when same character+mode already exists', async () => {
    const env = makeEnv({
      students: [{ id: 's1', name: 'Alice', points: 0, created_at: '2026-05-01' }],
      mistakes: [
        { id: 1, student_id: 's1', character: 'あ', mode: 'h2r', count: 3, last_at: '2026-05-02' },
      ],
    });
    const request = makeRequest('http://localhost/api/students/s1/mistakes', {
      method: 'POST',
      body: { character: 'あ', mode: 'h2r' },
    });
    const res = await recordMistake({ request, env, params: { id: 's1' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mistake.count).toBe(4);
    expect(env.DB._state.mistakes).toHaveLength(1);
  });

  it('rejects invalid mode', async () => {
    const env = makeEnv({
      students: [{ id: 's1', name: 'Alice', points: 0, created_at: '2026-05-01' }],
    });
    const request = makeRequest('http://localhost/api/students/s1/mistakes', {
      method: 'POST',
      body: { character: 'あ', mode: 'invalid' },
    });
    const res = await recordMistake({ request, env, params: { id: 's1' } });
    expect(res.status).toBe(400);
  });

  it('returns 404 when student does not exist', async () => {
    const env = makeEnv();
    const request = makeRequest('http://localhost/api/students/missing/mistakes', {
      method: 'POST',
      body: { character: 'あ', mode: 'h2r' },
    });
    const res = await recordMistake({
      request,
      env,
      params: { id: 'missing' },
    });
    expect(res.status).toBe(404);
  });
});
