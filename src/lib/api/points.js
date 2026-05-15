// ポイント API クライアント
// サーバ実装: functions/api/students/[id]/points.js

import { apiGet, apiPost } from '../apiClient.js';

export const getPoints = (studentId) =>
  apiGet(`/students/${studentId}/points`).then((d) => d.points ?? 0);

// 加算後の最新値を返す（{ id, points }）。
export const addPoints = (studentId, delta) =>
  apiPost(`/students/${studentId}/points`, { delta });
