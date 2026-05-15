import { describe, it, expect } from 'vitest';
import { login } from '../../functions/_lib/handlers/mentor.js';
import {
  hashPin,
  verifySessionToken,
  SESSION_COOKIE_NAME,
} from '../../functions/_lib/auth.js';
import { createD1Mock, makeRequest } from '../helpers/d1Mock.js';

const SALT = 'test-salt';
const PIN = '1234';

async function makeEnv() {
  const pin_hash = await hashPin(PIN, SALT);
  return {
    PIN_SALT: SALT,
    DB: createD1Mock({
      mentor_config: { id: 1, pin_hash },
    }),
  };
}

describe('POST /api/auth/mentor', () => {
  it('issues a session cookie when pin is correct', async () => {
    const env = await makeEnv();
    const request = makeRequest('http://localhost/api/auth/mentor', {
      method: 'POST',
      body: { pin: PIN },
    });
    const res = await login({ request, env });
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie');
    expect(cookie).toBeTruthy();
    expect(cookie).toContain(SESSION_COOKIE_NAME);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');

    // Cookie 値を抽出してトークン検証
    const match = cookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    expect(match).toBeTruthy();
    const token = match[1];
    expect(await verifySessionToken(env, token)).toBe(true);
  });

  it('rejects wrong pin', async () => {
    const env = await makeEnv();
    const request = makeRequest('http://localhost/api/auth/mentor', {
      method: 'POST',
      body: { pin: '9999' },
    });
    const res = await login({ request, env });
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('rejects malformed pin (non-4-digit)', async () => {
    const env = await makeEnv();
    const request = makeRequest('http://localhost/api/auth/mentor', {
      method: 'POST',
      body: { pin: 'abcd' },
    });
    const res = await login({ request, env });
    expect(res.status).toBe(400);
  });

  it('rejects login when mentor_config is in placeholder state', async () => {
    const env = {
      PIN_SALT: SALT,
      DB: createD1Mock({
        mentor_config: { id: 1, pin_hash: 'PLACEHOLDER' },
      }),
    };
    const request = makeRequest('http://localhost/api/auth/mentor', {
      method: 'POST',
      body: { pin: PIN },
    });
    const res = await login({ request, env });
    expect(res.status).toBe(401);
  });
});
