// 共通の fetch ラッパー。
//
// 全エンドポイントは /api 配下、JSON I/O、Cookie ベースのセッション(same-origin)。
// 失敗時は ApiError を throw する。呼び元は try/catch で UI にエラー表示する。

const BASE = '/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    // ネットワークエラー（オフライン等）
    throw new ApiError(`ネットワークに接続できないみたい (${e.message})`, 0);
  }
  const text = await res.text();
  const data = text ? safeParse(text) : null;
  if (!res.ok) {
    const msg = data?.error ?? `HTTP ${res.status}`;
    throw new ApiError(msg, res.status);
  }
  return data;
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const apiGet = (path) => request(path);
export const apiPost = (path, body) => request(path, { method: 'POST', body });
export const apiPatch = (path, body) => request(path, { method: 'PATCH', body });
export const apiDelete = (path, body) =>
  request(path, { method: 'DELETE', body });
