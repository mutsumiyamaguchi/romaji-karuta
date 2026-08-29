import { apiGet, apiPost } from '../apiClient.js';

export const getProgress = (studentId) => apiGet(`/students/${studentId}/progress`);
export const completePractice = (studentId, result) => apiPost(`/students/${studentId}/practice-completions`, result);
export const unlockAssessment = (studentId, step) => apiPost(`/students/${studentId}/assessments/${step}/unlock`);
export const startAssessment = (studentId, step) => apiPost(`/students/${studentId}/assessments/${step}/start`);
export const answerAssessment = (studentId, step, answer) => apiPost(`/students/${studentId}/assessments/${step}/answers`, answer);
