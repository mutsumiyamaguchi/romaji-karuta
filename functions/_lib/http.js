// 共通 HTTP ヘルパー

/**
 * JSON レスポンスを生成する。
 * @param {unknown} body
 * @param {number} [status]
 * @param {HeadersInit} [extraHeaders]
 */
export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

/**
 * エラーレスポンスを生成する。
 * @param {string} message
 * @param {number} status
 */
export function errorJson(message, status) {
  return json({ error: message }, status);
}

/**
 * リクエストボディを JSON としてパースする。失敗時は null を返す。
 * @param {Request} request
 */
export async function readJson(request) {
  try {
    const text = await request.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * ランダム ID を生成する（生徒 ID 用）。crypto.randomUUID が無い環境では fallback。
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // フォールバック: 16 byte random hex
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}
