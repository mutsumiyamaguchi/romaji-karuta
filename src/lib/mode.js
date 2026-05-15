// 出題モード（仕様書 §4.1）
//   h2r: ひらがな → ローマ字
//   r2h: ローマ字 → ひらがな
//
// アルファベットの大小は letterCase（'upper' | 'lower'）で独立制御する。
// 大文字スタートを既定にする方針なので default は 'upper'。
export const MODES = Object.freeze({
  h2r: 'h2r',
  r2h: 'r2h',
});

export const MODE_LABELS = Object.freeze({
  h2r: 'ひら → ロ',
  r2h: 'ロ → ひら',
});

// アルファベット大小切替（mode と独立に保持される）
export const LETTER_CASES = Object.freeze({
  upper: 'upper',
  lower: 'lower',
});

export const LETTER_CASE_LABELS = Object.freeze({
  upper: 'ABC',
  lower: 'abc',
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

// letterCase に応じてローマ字を大小変換する。
const applyLetterCase = (s, letterCase) =>
  letterCase === LETTER_CASES.upper ? s.toUpperCase() : s;

// 読み札（問題）に表示する文字列を返す
//   item: { h, r, alts?, row, displayR? }
//   mode: 'h2r' | 'r2h'
//   letterCase: 'upper' | 'lower' （default: 'upper'）
export const getPrompt = (item, mode, letterCase = LETTER_CASES.upper) => {
  if (mode === MODES.r2h) {
    return applyLetterCase(resolveDisplay(item), letterCase);
  }
  // h2r はひらがなを問題に出す（letterCase の影響を受けない）
  return item.h;
};

// 取り札（選択肢）に表示する文字列を返す
//   item: { h, r, alts?, row, displayR? }
//   mode: 'h2r' | 'r2h'
//   letterCase: 'upper' | 'lower' （default: 'upper'）
export const getChoiceLabel = (item, mode, letterCase = LETTER_CASES.upper) => {
  if (mode === MODES.r2h) return item.h;
  return applyLetterCase(resolveDisplay(item), letterCase);
};
