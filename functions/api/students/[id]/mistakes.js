// /api/students/:id/mistakes

import {
  listMistakes,
  recordMistake,
  clearMistakes,
} from '../../../_lib/handlers/mistakes.js';

export const onRequestGet = (context) => listMistakes(context);
export const onRequestPost = (context) => recordMistake(context);
export const onRequestDelete = (context) => clearMistakes(context);
