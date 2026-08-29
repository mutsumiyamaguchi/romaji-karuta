// /api/students/:id/points

import { getPoints } from '../../../_lib/handlers/points.js';

export const onRequestGet = (context) => getPoints(context);
