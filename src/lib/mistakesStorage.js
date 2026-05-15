// localStorage を介したミス（そにもつ）記録（仕様書 §F8）
//
// 記録単位:
//   { h: 'し', r: 'shi', at: 1715760000000 } のログ形式で push する。
//   集計はクライアントで行い、ひらがな h ごとに件数を集計する。
//   r は表示時に使ったローマ字（訓令式 or ヘボン式）を記録し、
//   どちらでより躓いているか後で見えるようにする。
//
// 直近 1000 件まで保持（古いものは捨てる）。
const STORAGE_KEY = 'romajiMistakes';
const MAX_LOG = 1000;

const readLog = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const recordMistake = (item) => {
  if (!item || !item.h) return;
  try {
    const log = readLog();
    const r = item.displayR ?? (Array.isArray(item.r) ? item.r[0] : item.r) ?? '';
    log.push({ h: item.h, r, at: Date.now() });
    const trimmed = log.length > MAX_LOG ? log.slice(-MAX_LOG) : log;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore: SSR や localStorage 非対応環境
  }
};

// h ごとに集計して count 降順で返す。
//   [{ h: 'し', count: 8, byR: { si: 5, shi: 3 } }, ...]
export const getMistakesSummary = () => {
  const log = readLog();
  const map = new Map();
  for (const m of log) {
    if (!map.has(m.h)) map.set(m.h, { h: m.h, count: 0, byR: {} });
    const e = map.get(m.h);
    e.count++;
    if (m.r) e.byR[m.r] = (e.byR[m.r] ?? 0) + 1;
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
};

// 「にがてだけ」モード用に、ひらがな（h）の集合を返す。
export const getWeakKanas = (limit = 15) => {
  return getMistakesSummary().slice(0, limit).map((e) => e.h);
};

export const clearMistakes = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};
