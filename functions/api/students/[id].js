// /api/students/:id

import { deleteStudent } from '../../_lib/handlers/students.js';

export const onRequestDelete = (context) => deleteStudent(context);
