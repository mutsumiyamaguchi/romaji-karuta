// /api/auth/mentor のコアロジック

import { json, errorJson, readJson } from '../http.js';
import { verifyPin, issueSessionToken, buildSessionCookie } from '../auth.js';

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
