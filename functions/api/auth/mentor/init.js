// /api/auth/mentor/init

import { initPin } from '../../../_lib/handlers/mentor.js';

export const onRequestPost = (context) => initPin(context);
