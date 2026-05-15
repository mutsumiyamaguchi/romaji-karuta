import { describe, it, expect } from 'vitest';
import {
  listStudents,
  createStudent,
  deleteStudent,
} from '../../functions/_lib/handlers/students.js';
import { hashPin } from '../../functions/_lib/auth.js';
import { createD1Mock, makeRequest } from '../helpers/d1Mock.js';

const SALT = 'test-salt';
const PIN = '1234';

async function makeEnv(extra = {}) {
  const pin_hash = await hashPin(PIN, SALT);
  return {
    PIN_SALT: SALT,
    DB: createD1Mock({
      mentor_config: { id: 1, pin_hash },
      ...extra,
    }),
  };
}

describe('GET /api/students (listStudents)', () => {
  it('returns empty list when no students', async () => {
    const env = await makeEnv();
    const res = await listStudents({ env });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.students).toEqual([]);
  });

  it('returns existing students sorted by created_at', async () => {
    const env = await makeEnv({
      students: [
        { id: 's1', name: 'Alice', points: 10, created_at: '2026-05-01' },
        { id: 's2', name: 'Bob', points: 5, created_at: '2026-05-02' },
      ],
    });
    const res = await listStudents({ env });
    const body = await res.json();
    expect(body.students.map((s) => s.id)).toEqual(['s1', 's2']);
  });
});

describe('POST /api/students (createStudent)', () => {
  it('rejects without pin', async () => {
    const env = await makeEnv();
    const request = makeRequest('http://localhost/api/students', {
      method: 'POST',
      body: { name: 'Charlie' },
    });
    const res = await createStudent({ request, env });
    expect(res.status).toBe(401);
  });

  it('rejects empty name', async () => {
    const env = await makeEnv();
    const request = makeRequest('http://localhost/api/students', {
      method: 'POST',
      body: { name: '', pin: PIN },
    });
    const res = await createStudent({ request, env });
    expect(res.status).toBe(400);
  });

  it('creates student with valid pin', async () => {
    const env = await makeEnv();
    const request = makeRequest('http://localhost/api/students', {
      method: 'POST',
      body: { name: 'Charlie', pin: PIN },
    });
    const res = await createStudent({ request, env });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.student.name).toBe('Charlie');
    expect(body.student.points).toBe(0);
    expect(typeof body.student.id).toBe('string');
    expect(env.DB._state.students).toHaveLength(1);
  });

  it('rejects incorrect pin', async () => {
    const env = await makeEnv();
    const request = makeRequest('http://localhost/api/students', {
      method: 'POST',
      body: { name: 'Charlie', pin: '9999' },
    });
    const res = await createStudent({ request, env });
    expect(res.status).toBe(401);
    expect(env.DB._state.students).toHaveLength(0);
  });
});

describe('DELETE /api/students/:id (deleteStudent)', () => {
  it('deletes student and cascades mistakes', async () => {
    const env = await makeEnv({
      students: [{ id: 's1', name: 'Alice', points: 10, created_at: '2026-05-01' }],
      mistakes: [
        { id: 1, student_id: 's1', character: 'あ', mode: 'h2r', count: 3, last_at: '2026-05-02' },
      ],
    });
    const request = makeRequest('http://localhost/api/students/s1', {
      method: 'DELETE',
      body: { pin: PIN },
    });
    const res = await deleteStudent({ request, env, params: { id: 's1' } });
    expect(res.status).toBe(200);
    expect(env.DB._state.students).toHaveLength(0);
    expect(env.DB._state.mistakes).toHaveLength(0);
  });

  it('returns 404 when student does not exist', async () => {
    const env = await makeEnv();
    const request = makeRequest('http://localhost/api/students/missing', {
      method: 'DELETE',
      body: { pin: PIN },
    });
    const res = await deleteStudent({
      request,
      env,
      params: { id: 'missing' },
    });
    expect(res.status).toBe(404);
  });

  it('rejects without pin', async () => {
    const env = await makeEnv({
      students: [{ id: 's1', name: 'Alice', points: 0, created_at: '2026-05-01' }],
    });
    const request = makeRequest('http://localhost/api/students/s1', {
      method: 'DELETE',
      body: {},
    });
    const res = await deleteStudent({ request, env, params: { id: 's1' } });
    expect(res.status).toBe(401);
    expect(env.DB._state.students).toHaveLength(1);
  });
});
