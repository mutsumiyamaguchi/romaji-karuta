// /api/auth/mentor/pin

import { changePin } from '../../../_lib/handlers/mentor.js';

export const onRequestPost = (context) => changePin(context);
