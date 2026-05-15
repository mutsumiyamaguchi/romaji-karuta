// /api/mentor/config

import { getConfig, updateConfig } from '../../_lib/handlers/mentor.js';

export const onRequestGet = (context) => getConfig(context);
export const onRequestPatch = (context) => updateConfig(context);
