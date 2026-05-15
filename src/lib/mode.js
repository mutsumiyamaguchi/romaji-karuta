// 出題モード（仕様書 §4.1）
//   h2r: ひらがな → 小文字ローマ字（既存挙動）
//   r2h: 小文字ローマ字 → ひらがな
//   H2R: ひらがな → 大文字ローマ字
export const MODES = Object.freeze({
  h2r: 'h2r',
  r2h: 'r2h',
  H2R: 'H2R',
});

export const MODE_LABELS = Object.freeze({
  h2r: 'ひら → ロ',
  r2h: 'ロ → ひら',
  H2R: 'ABC おおもじ',
});

// item.r と item.alts を合わせた候補からランダムに 1 つ選ぶ。
//   訓令式とヘボン式が異なる文字（し/ち/つ/ふ）に対し、出題のたびに表記をランダム化する。
//   item.r が単一表記（alts なし）の場合はそれを返す。
export const pickRomaji = (item) => {
  if (!item || typeof item.r !== 'string') return '';
  const alts = Array.isArray(item.alts) ? item.alts : [];
  if (alts.length === 0) return item.r;
  const candidates = [item.r, ...alts];
  return candidates[Math.floor(Math.random() * candidates.length)];
};

// 表示用の romaji を解決する。
//   item.displayR があればそれ（PlayContainer で固定済み）、なければ item.r（主表記）。
const resolveDisplay = (item) => item?.displayR || item?.r || '';

// 読み札（問題）に表示する文字列を返す
//   item: { h, r, alts?, row, displayR? }
//   mode: 'h2r' | 'r2h' | 'H2R'
export const getPrompt = (item, mode) => {
  if (mode === MODES.r2h) return resolveDisplay(item);
  // h2r / H2R は両方ともひらがなを問題に出す
  return item.h;
};

// 取り札（選択肢）に表示する文字列を返す
//   item: { h, r, alts?, row, displayR? }
//   mode: 'h2r' | 'r2h' | 'H2R'
export const getChoiceLabel = (item, mode) => {
  if (mode === MODES.r2h) return item.h;
  const r = resolveDisplay(item);
  if (mode === MODES.H2R) return r.toUpperCase();
  return r;
};
