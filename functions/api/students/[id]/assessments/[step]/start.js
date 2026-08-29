import { startAssessment } from '../../../../../_lib/handlers/progress.js';
export const onRequestPost = (context) => startAssessment(context);
