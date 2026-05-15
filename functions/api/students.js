// /api/students
//
// Pages Functions のファイルベースルーティング。
// ハンドラ本体は ../_lib/handlers/students.js に切り出してテストを容易にしている。

import { listStudents, createStudent } from '../_lib/handlers/students.js';

export const onRequestGet = (context) => listStudents(context);
export const onRequestPost = (context) => createStudent(context);
