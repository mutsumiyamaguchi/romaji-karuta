// /api/auth/mentor

import { login } from '../../_lib/handlers/mentor.js';

export const onRequestPost = (context) => login(context);
