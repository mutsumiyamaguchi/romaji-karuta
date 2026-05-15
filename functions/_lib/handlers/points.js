// /api/students/:id/points のコアロジック

import { json, errorJson, readJson } from '../http.js';

/**
 * GET /api/students/:id/points
 */
export async function getPoints({ env, params }) {
  if (!env?.DB) return errorJson('DB binding is missing', 500);
  const id = params?.id;
  if (!id || typeof id !== 'string') return errorJson('id is required', 400);
  const row = await env.DB
    .prepare('SELECT id, points FROM students WHERE id = ?')
    .bind(id)
    .first();
  if (!row) return errorJson('student not found', 404);
  return json({ id: row.id, points: row.points ?? 0 });
}

/**
 * POST /api/students/:id/points
 *   ボディ: { delta: number }
 *   delta を加算した最新値を返す。
 */
export async function addPoints({ request, env, params }) {
  if (!env?.DB) return errorJson('DB binding is missing', 500);
  const id = params?.id;
  if (!id || typeof id !== 'string') return errorJson('id is required', 400);
  const body = await readJson(request);
  const delta = body?.delta;
  if (typeof delta !== 'number' || !Number.isFinite(delta)) {
    return errorJson('delta must be a finite number', 400);
  }
  const existing = await env.DB
    .prepare('SELECT id FROM students WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return errorJson('student not found', 404);
  await env.DB
    .prepare('UPDATE students SET points = points + ? WHERE id = ?')
    .bind(delta, id)
    .run();
  const row = await env.DB
    .prepare('SELECT id, points FROM students WHERE id = ?')
    .bind(id)
    .first();
  return json({ id: row.id, points: row.points ?? 0 });
}
