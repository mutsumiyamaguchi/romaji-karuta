// メンター PIN 認証ユーティリティ
//
// PIN は 4 桁数字。Web Crypto SubtleCrypto.digest('SHA-256') で固定ソルト + PIN を
// ハッシュ化する。bcrypt は Workers 環境で重い + Edge ランタイムで使えないため不採用。
//
// セッションは HttpOnly Cookie に、PIN_SALT で署名した不透明トークンを載せる方式。
// MVP では 24h 固定で良い。

const COOKIE_NAME = 'mentor_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 時間

/**
 * 文字列を hex 表記の SHA-256 ハッシュに変換する。
 * @param {string} input
 * @returns {Promise<string>} 64 文字の hex 文字列
 */
export async function sha256Hex(input) {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * PIN を salt と組み合わせてハッシュ化する。
 * @param {string} pin
 * @param {string} salt
 */
export async function hashPin(pin, salt) {
  if (!pin || typeof pin !== 'string') throw new Error('pin is required');
  if (!salt || typeof salt !== 'string') throw new Error('salt is required');
  return sha256Hex(`${salt}:${pin}`);
}

/**
 * 与えられた PIN が DB に保存された pin_hash と一致するかを確認。
 * 一致したら true を返す。
 * @param {{DB: D1Database, PIN_SALT?: string}} env
 * @param {string} pin
 */
export async function verifyPin(env, pin) {
  if (!env?.DB) throw new Error('DB binding is missing');
  const salt = env.PIN_SALT ?? '';
  const row = await env.DB
    .prepare('SELECT pin_hash FROM mentor_config WHERE id = 1')
    .first();
  if (!row || !row.pin_hash) return false;
  // プレースホルダ状態（初期化前）は常に拒否
  if (row.pin_hash === 'PLACEHOLDER') return false;
  const hash = await hashPin(pin, salt);
  return constantTimeEqual(hash, row.pin_hash);
}

/**
 * 文字列を一定時間比較。長さが違えば短絡 false。
 * @param {string} a
 * @param {string} b
 */
export function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * セッショントークンを生成する。
 * 構造: base64url(payload).base64url(signature)
 *   payload = JSON({ exp: <unix秒> })
 *   signature = HMAC-SHA256(payload, PIN_SALT) ... ただし Web Crypto では
 *     HMAC は importKey が必要なので、簡易に SHA-256(salt + ':' + payload) で代用
 *
 * MVP の内部利用前提なのでこの強度で十分。
 * @param {{PIN_SALT?: string}} env
 */
export async function issueSessionToken(env) {
  const salt = env?.PIN_SALT ?? '';
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = JSON.stringify({ exp });
  const payloadB64 = base64urlEncode(payload);
  const signature = await sha256Hex(`${salt}:${payloadB64}`);
  return `${payloadB64}.${signature}`;
}

/**
 * セッショントークンを検証する。期限切れや署名不一致は false を返す。
 * @param {{PIN_SALT?: string}} env
 * @param {string | undefined | null} token
 */
export async function verifySessionToken(env, token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, signature] = parts;
  const salt = env?.PIN_SALT ?? '';
  const expected = await sha256Hex(`${salt}:${payloadB64}`);
  if (!constantTimeEqual(expected, signature)) return false;
  try {
    const payload = JSON.parse(base64urlDecode(payloadB64));
    if (typeof payload?.exp !== 'number') return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * リクエストの Cookie からセッショントークンを抽出して検証する。
 * @param {Request} request
 * @param {object} env
 */
export async function isMentorAuthenticated(request, env) {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const token = parseCookie(cookieHeader, COOKIE_NAME);
  return verifySessionToken(env, token);
}

/**
 * PIN を直接渡して認可を確認する（POST ボディ経由のエンドポイント用）。
 * Cookie かボディの pin どちらかが有効なら通す。
 * @param {Request} request
 * @param {object} env
 * @param {{pin?: string} | null} body
 */
export async function requireMentor(request, env, body = null) {
  if (await isMentorAuthenticated(request, env)) return true;
  if (body?.pin && (await verifyPin(env, body.pin))) return true;
  return false;
}

/**
 * Set-Cookie ヘッダ値を組み立てる。
 * @param {string} token
 */
export function buildSessionCookie(token) {
  const attrs = [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  return attrs.join('; ');
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

// ---- helpers ----

function parseCookie(header, name) {
  if (!header) return null;
  const items = header.split(';');
  for (const item of items) {
    const idx = item.indexOf('=');
    if (idx < 0) continue;
    const k = item.slice(0, idx).trim();
    const v = item.slice(idx + 1).trim();
    if (k === name) return v;
  }
  return null;
}

function base64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(b64url) {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
