// ポイント API クライアント
// サーバ実装: functions/api/students/[id]/points.js

import { apiGet } from '../apiClient.js';

export const getPoints = (studentId) =>
  apiGet(`/students/${studentId}/points`).then((d) => d.points ?? 0);
