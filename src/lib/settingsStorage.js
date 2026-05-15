// localStorage を介したメンター設定（PIN・リベンジオプション）の永続化。
//
// PIN: 4 桁の数字文字列。初回はデフォルト '0000'（メンターが mvp 起動後すぐ変更想定）。
// リベンジオプション: { immediate, summary } 共に boolean。
//
// すべて localStorage 完結。後日 D1 移行する想定。
const PIN_KEY = 'romajiMentorPin';
const REVENGE_KEY = 'romajiRevengeOptions';
const DEFAULT_PIN = '0000';
const DEFAULT_REVENGE = Object.freeze({ immediate: true, summary: true });

export const getPin = () => {
  try {
    const v = localStorage.getItem(PIN_KEY);
    return v && /^\d{4}$/.test(v) ? v : DEFAULT_PIN;
  } catch {
    return DEFAULT_PIN;
  }
};

export const setPin = (pin) => {
  if (!/^\d{4}$/.test(String(pin))) return false;
  try {
    localStorage.setItem(PIN_KEY, String(pin));
    return true;
  } catch {
    return false;
  }
};

export const verifyPin = (pin) => String(pin) === getPin();

export const getRevengeOptions = () => {
  try {
    const raw = localStorage.getItem(REVENGE_KEY);
    if (!raw) return { ...DEFAULT_REVENGE };
    const parsed = JSON.parse(raw);
    return {
      immediate: parsed.immediate !== false,
      summary: parsed.summary !== false,
    };
  } catch {
    return { ...DEFAULT_REVENGE };
  }
};

export const setRevengeOptions = (opts) => {
  try {
    localStorage.setItem(
      REVENGE_KEY,
      JSON.stringify({
        immediate: !!opts.immediate,
        summary: !!opts.summary,
      })
    );
  } catch {
    // ignore
  }
};
