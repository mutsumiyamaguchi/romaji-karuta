// /api/students/:id/mistakes のコアロジック

import { json, errorJson, readJson } from '../http.js';
import { requireMentor } from '../auth.js';

const VALID_MODES = new Set(['h2r', 'r2h']);

/**
 * GET /api/students/:id/mistakes
 *   そにもつリストを count 降順で返す。
 */
export async function listMistakes({ env, params }) {
  if (!env?.DB) return errorJson('DB binding is missing', 500);
  const id = params?.id;
  if (!id || typeof id !== 'string') return errorJson('id is required', 400);
  const result = await env.DB
    .prepare(
      `SELECT id, student_id, character, mode, count, last_at
       FROM mistakes
       WHERE student_id = ?
       ORDER BY count DESC, last_at DESC`
    )
    .bind(id)
    .all();
  return json({ mistakes: result?.results ?? [] });
}

/**
 * POST /api/students/:id/mistakes
 *   ボディ: { character: string, mode: 'h2r' | 'r2h' }
 *   既存があれば count を +1、last_at を更新。なければ新規作成。
 */
export async function recordMistake({ request, env, params }) {
  if (!env?.DB) return errorJson('DB binding is missing', 500);
  const id = params?.id;
  if (!id || typeof id !== 'string') return errorJson('id is required', 400);
  const body = await readJson(request);
  const character = body?.character;
  const mode = body?.mode;
  if (typeof character !== 'string' || character === '') {
    return errorJson('character is required', 400);
  }
  if (!VALID_MODES.has(mode)) {
    return errorJson('mode must be one of h2r, r2h', 400);
  }
  const student = await env.DB
    .prepare('SELECT id FROM students WHERE id = ?')
    .bind(id)
    .first();
  if (!student) return errorJson('student not found', 404);

  const existing = await env.DB
    .prepare(
      `SELECT id, count FROM mistakes
       WHERE student_id = ? AND character = ? AND mode = ?`
    )
    .bind(id, character, mode)
    .first();

  if (existing) {
    await env.DB
      .prepare(
        `UPDATE mistakes SET count = count + 1, last_at = datetime('now') WHERE id = ?`
      )
      .bind(existing.id)
      .run();
  } else {
    await env.DB
      .prepare(
        `INSERT INTO mistakes (student_id, character, mode, count) VALUES (?, ?, ?, 1)`
      )
      .bind(id, character, mode)
      .run();
  }

  const row = await env.DB
    .prepare(
      `SELECT id, student_id, character, mode, count, last_at
       FROM mistakes
       WHERE student_id = ? AND character = ? AND mode = ?`
    )
    .bind(id, character, mode)
    .first();
  return json({ mistake: row }, existing ? 200 : 201);
}

/**
 * DELETE /api/students/:id/mistakes
 *   メンター認証必須。対象生徒の mistakes を全件削除する。
 *   生徒が存在しなければ 404、PIN/Cookie 認証が無ければ 401。
 *
 *   認証経路: 通常はクライアント (src/lib/api/mistakes.js#clearMistakes) が
 *   Cookie セッションで叩く想定。body.pin 経路は deleteStudent と同じく、
 *   外部ツール等からの呼び出しに対する互換として残してある。
 *   (一部 WAF/プロキシは DELETE body を落とすため、運用上は Cookie 推奨)
 */
export async function clearMistakes({ request, env, params }) {
  if (!env?.DB) return errorJson('DB binding is missing', 500);
  const id = params?.id;
  if (!id || typeof id !== 'string') return errorJson('id is required', 400);
  const body = await readJson(request);
  if (!(await requireMentor(request, env, body))) {
    return errorJson('mentor authentication required', 401);
  }
  const student = await env.DB
    .prepare('SELECT id FROM students WHERE id = ?')
    .bind(id)
    .first();
  if (!student) return errorJson('student not found', 404);
  await env.DB
    .prepare('DELETE FROM mistakes WHERE student_id = ?')
    .bind(id)
    .run();
  return json({ ok: true });
}
