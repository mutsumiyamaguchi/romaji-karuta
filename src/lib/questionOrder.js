import { shuffle } from './shuffle.js';

// 行別練習は登録順を学習手掛かりにさせないため、開始ごとに並べ替える。
export const orderRowQuestions = (items, row) =>
  shuffle(items.filter((item) => item.row === row));

// 誤答だけの再挑戦も、直前の出題順を引き継がない。
export const orderRetryQuestions = (mistakes) => shuffle(mistakes);
