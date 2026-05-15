// /api/students/:id/points

import { getPoints, addPoints } from '../../../_lib/handlers/points.js';

export const onRequestGet = (context) => getPoints(context);
export const onRequestPost = (context) => addPoints(context);
