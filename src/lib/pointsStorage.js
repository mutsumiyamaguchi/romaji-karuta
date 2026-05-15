// localStorage を介したポイント永続化（将来 D1 化の足場）
const STORAGE_KEY = 'romajiPoints';

export const getPoints = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null || saved === undefined) return 0;
    const parsed = parseInt(saved, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
};

export const setPoints = (points) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(points));
  } catch {
    // ignore: SSR や localStorage 非対応環境
  }
};
