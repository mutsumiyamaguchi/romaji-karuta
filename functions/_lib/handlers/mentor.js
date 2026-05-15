// /api/auth/mentor + /api/mentor/* のコアロジック

import { json, errorJson, readJson } from '../http.js';
import {
  verifyPin,
  hashPin,
  issueSessionToken,
  buildSessionCookie,
  requireMentor,
} from '../auth.js';

/**
 * POST /api/auth/mentor
 *   ボディ: { pin: string }
 *   PIN が一致したらセッショントークンを Set-Cookie で返す。
 */
export async function login({ request, env }) {
  if (!env?.DB) return errorJson('DB binding is missing', 500);
  const body = await readJson(request);
  const pin = body?.pin;
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return errorJson('pin must be a 4-digit string', 400);
  }
  const ok = await verifyPin(env, pin);
  if (!ok) {
    return errorJson('invalid pin', 401);
  }
  const token = await issueSessionToken(env);
  return json({ ok: true }, 200, {
    'set-cookie': buildSessionCookie(token),
  });
}

/**
 * GET /api/auth/mentor/status
 *   初回セットアップ完了状態を返す。
 *   { initialized: boolean }
 */
export async function getStatus({ env }) {
  if (!env?.DB) return errorJson('DB binding is missing', 500);
  const row = await env.DB
    .prepare('SELECT pin_hash FROM mentor_config WHERE id = 1')
    .first();
  const initialized = !!row?.pin_hash && row.pin_hash !== 'PLACEHOLDER';
  return json({ initialized });
}

/**
 * POST /api/auth/mentor/init
 *   ボディ: { pin: string (4-digit) }
 *   PLACEHOLDER 状態のときのみ受け付ける（初回専用）。
 *   セッションも同時に発行する。
 */
export async function initPin({ request, env }) {
  if (!env?.DB) return errorJson('DB binding is missing', 500);
  const body = await readJson(request);
  const pin = body?.pin;
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return errorJson('pin must be a 4-digit string', 400);
  }
  const row = await env.DB
    .prepare('SELECT pin_hash FROM mentor_config WHERE id = 1')
    .first();
  if (!row) return errorJson('mentor_config row missing', 500);
  if (row.pin_hash && row.pin_hash !== 'PLACEHOLDER') {
    return errorJson('already initialized', 409);
  }
  const salt = env.PIN_SALT ?? '';
  const hash = await hashPin(pin, salt);
  await env.DB
    .prepare('UPDATE mentor_config SET pin_hash = ? WHERE id = 1')
    .bind(hash)
    .run();
  const token = await issueSessionToken(env);
  return json({ ok: true }, 200, {
    'set-cookie': buildSessionCookie(token),
  });
}

/**
 * POST /api/auth/mentor/pin
 *   ボディ: { pin: string (現在のPIN), newPin: string (新しいPIN, 4-digit) }
 *   セッション or 旧PINでの認証が必要。
 */
export async function changePin({ request, env }) {
  if (!env?.DB) return errorJson('DB binding is missing', 500);
  const body = await readJson(request);
  const newPin = body?.newPin;
  if (typeof newPin !== 'string' || !/^\d{4}$/.test(newPin)) {
    return errorJson('newPin must be a 4-digit string', 400);
  }
  if (!(await requireMentor(request, env, body))) {
    return errorJson('mentor authentication required', 401);
  }
  const salt = env.PIN_SALT ?? '';
  const hash = await hashPin(newPin, salt);
  await env.DB
    .prepare('UPDATE mentor_config SET pin_hash = ? WHERE id = 1')
    .bind(hash)
    .run();
  return json({ ok: true });
}
