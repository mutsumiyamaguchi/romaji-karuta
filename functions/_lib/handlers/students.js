// /api/students のコアロジック
//
// Pages Functions のエントリポイントから呼び出され、純粋に { request, env } のみを
// 受け取って Response を返す。これにより Vitest からも同じ関数を呼んでテストできる。

import { json, errorJson, readJson, generateId } from '../http.js';
import { requireMentor } from '../auth.js';

/**
 * GET /api/students
 *   全生徒一覧を返す。
 */
export async function listStudents({ env }) {
  if (!env?.DB) return errorJson('DB binding is missing', 500);
  const result = await env.DB
    .prepare('SELECT id, name, points, created_at FROM students ORDER BY created_at ASC')
    .all();
  return json({ students: result?.results ?? [] });
}

/**
 * POST /api/students
 *   ボディ: { name: string, pin: string }
 *   PIN 検証必須。生徒を新規作成して返す。
 */
export async function createStudent({ request, env }) {
  if (!env?.DB) return errorJson('DB binding is missing', 500);
  const body = await readJson(request);
  if (!body || typeof body.name !== 'string' || body.name.trim() === '') {
    return errorJson('name is required', 400);
  }
  if (!(await requireMentor(request, env, body))) {
    return errorJson('mentor authentication required', 401);
  }
  const id = generateId();
  const name = body.name.trim();
  await env.DB
    .prepare('INSERT INTO students (id, name, points) VALUES (?, ?, 0)')
    .bind(id, name)
    .run();
  const student = await env.DB
    .prepare('SELECT id, name, points, created_at FROM students WHERE id = ?')
    .bind(id)
    .first();
  return json({ student }, 201);
}

/**
 * DELETE /api/students/:id
 *   PIN 検証必須。生徒とそにもつを連動削除する。
 */
export async function deleteStudent({ request, env, params }) {
  if (!env?.DB) return errorJson('DB binding is missing', 500);
  const id = params?.id;
  if (!id || typeof id !== 'string') return errorJson('id is required', 400);
  const body = await readJson(request);
  if (!(await requireMentor(request, env, body))) {
    return errorJson('mentor authentication required', 401);
  }
  // CASCADE が効かないケースに備えて mistakes を先に削除
  await env.DB.prepare('DELETE FROM mistakes WHERE student_id = ?').bind(id).run();
  const result = await env.DB
    .prepare('DELETE FROM students WHERE id = ?')
    .bind(id)
    .run();
  const meta = result?.meta ?? {};
  if (typeof meta.changes === 'number' && meta.changes === 0) {
    return errorJson('student not found', 404);
  }
  return json({ ok: true });
}
