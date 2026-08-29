import { describe, it, expect } from 'vitest';
import { getPoints } from '../../functions/_lib/handlers/points.js';
import * as pointsRoute from '../../functions/api/students/[id]/points.js';
import { createD1Mock } from '../helpers/d1Mock.js';

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
    expect(body).toEqual({ id: 's1', points: 42, totalPoints: 42, availablePoints: 42 });
  });

  it('returns 404 when student missing', async () => {
    const env = makeEnv();
    const res = await getPoints({ env, params: { id: 'missing' } });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/students/:id/points', () => {
  it('is not exposed', () => {
    expect(pointsRoute.onRequestPost).toBeUndefined();
  });
});
