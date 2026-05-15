// そにもつ（誤答）API クライアント
// サーバ実装: functions/api/students/[id]/mistakes.js

import { apiGet, apiPost, apiDelete } from '../apiClient.js';

// サーバから返るのは [{ id, student_id, character, mode, count, last_at }]（count 降順）
export const listMistakes = (studentId) =>
  apiGet(`/students/${studentId}/mistakes`).then((d) => d.mistakes ?? []);

export const recordMistake = (studentId, { character, mode }) =>
  apiPost(`/students/${studentId}/mistakes`, { character, mode });

// メンター認証必須。対象生徒の苦手な文字を全件サーバから消す。
export const clearMistakes = (studentId) =>
  apiDelete(`/students/${studentId}/mistakes`);

// 「にがてだけ」モード用に、ひらがな（character）の集合を返す。
// クライアント側で集計済みデータからユニーク化（mode 違いをまとめる）。
export const getWeakCharacters = async (studentId, limit = 15) => {
  const list = await listMistakes(studentId);
  const seen = new Set();
  const out = [];
  for (const m of list) {
    if (seen.has(m.character)) continue;
    seen.add(m.character);
    out.push(m.character);
    if (out.length >= limit) break;
  }
  return out;
};
