// /api/auth/mentor/status

import { getStatus } from '../../../_lib/handlers/mentor.js';

export const onRequestGet = (context) => getStatus(context);
