// /api/students/:id/points のコアロジック

import { json, errorJson } from '../http.js';

/**
 * GET /api/students/:id/points
 */
export async function getPoints({ env, params }) {
  if (!env?.DB) return errorJson('DB binding is missing', 500);
  const id = params?.id;
  if (!id || typeof id !== 'string') return errorJson('id is required', 400);
  const row = await env.DB
    .prepare('SELECT id, total_points, available_points FROM students WHERE id = ?')
    .bind(id)
    .first();
  if (!row) return errorJson('student not found', 404);
  return json({ id: row.id, points: row.total_points ?? 0, totalPoints: row.total_points ?? 0, availablePoints: row.available_points ?? 0 });
}
