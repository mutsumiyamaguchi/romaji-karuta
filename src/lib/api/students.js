// 生徒 CRUD API クライアント
// サーバ実装: functions/api/students.js + functions/api/students/[id].js

import { apiGet, apiPost, apiDelete } from '../apiClient.js';

export const listStudents = () => apiGet('/students').then((d) => d.students ?? []);

// PIN は requireMentor 用。Cookie が有効なら省略可。
export const createStudent = ({ name, pin }) =>
  apiPost('/students', { name, pin }).then((d) => d.student);

export const deleteStudent = ({ id, pin }) =>
  apiDelete(`/students/${id}`, pin ? { pin } : undefined);
