// /api/students/:id/mistakes

import { listMistakes, recordMistake } from '../../../_lib/handlers/mistakes.js';

export const onRequestGet = (context) => listMistakes(context);
export const onRequestPost = (context) => recordMistake(context);
