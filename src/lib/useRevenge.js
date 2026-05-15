import { useCallback, useMemo, useRef, useState } from 'react';
import { shuffle } from './shuffle.js';

/**
 * useRevenge: 問題セットに「即時リベンジ」「サマリーリベンジ」を適用するフック
 *
 * 使い方:
 *   const revenge = useRevenge(initialQuestions, { immediate: true, summary: true });
 *   revenge.currentQuestion          // 現在の問題（{h, r, row}） or null
 *   revenge.currentIndex             // 表示用インデックス（0始まり）
 *   revenge.totalCount               // 残り問題数を含む現在の総出題数（リベンジで増える）
 *   revenge.handleResult(isCorrect)  // 正解/不正解を伝える。内部で進行＆リベンジキュー操作
 *   revenge.isFinished               // 全問題終了したか
 *   revenge.phase                    // 'main' or 'summary'
 *   revenge.getMistakeSummary()      // メインフェーズで間違えた問題の一意リストを返す（F8 そにもつ連携用）
 *
 * 仕様:
 * - 不正解時 immediate=true なら、次の問題として同じ問題を1度だけ挿入（連続失敗で多重挿入はしない）
 * - メイン問題セット終了時 summary=true なら、メインで間違えた問題のユニーク集合を別フェーズで提示
 * - サマリーフェーズ内では immediate リベンジは効く。が、再度サマリーは作らない（無限ループ防止）
 */
export function useRevenge(initialQuestions, options = {}) {
  const { immediate = true, summary = true } = options;

  // 初期キューはコンポーネントマウント時に1度だけ確定させたい。
  // useState の初期化関数を使えば毎レンダーで再計算しない。
  const [queue, setQueue] = useState(() =>
    Array.isArray(initialQuestions) ? [...initialQuestions] : []
  );
  // 表示用にいま「何問目を見ているか」を管理（リベンジでキューが伸びても累積する）
  const [currentIndex, setCurrentIndex] = useState(0);
  // メインで間違えた問題（参照を保持）
  const [mainMistakes, setMainMistakes] = useState([]);
  // 直前に間違えた問題（連続失敗で多重挿入しないためのガード）
  const lastRevengedRef = useRef(null);
  // 現在のフェーズ
  const [phase, setPhase] = useState(() => {
    return Array.isArray(initialQuestions) && initialQuestions.length === 0
      ? 'main'
      : 'main';
  });

  // immediate / summary はレンダーをまたいで参照したいので ref に入れておく
  // (handleResult のクロージャ内で常に最新の判定オプションを参照するため)
  const optionsRef = useRef({ immediate, summary });
  optionsRef.current = { immediate, summary };

  const currentQuestion = queue[currentIndex] ?? null;
  const isFinished = currentQuestion === null;
  const totalCount = queue.length;

  const handleResult = useCallback((isCorrect) => {
    // すでに終了している場合は何もしない
    if (currentIndex >= queue.length) return;

    const current = queue[currentIndex];
    const opts = optionsRef.current;

    // 「今回のミスを含めた」mainMistakes を作って後段に渡す。
    // setMainMistakes を呼んだ直後の state はバッチ更新で未反映なので、
    // 同一 tick でサマリー判定に使う場合はローカル変数で参照する必要がある。
    let nextMainMistakes = mainMistakes;
    if (!isCorrect && phase === 'main' && !mainMistakes.includes(current)) {
      nextMainMistakes = [...mainMistakes, current];
      setMainMistakes(nextMainMistakes);
    }

    if (isCorrect) {
      // 正解。次へ進む。
      const nextIndex = currentIndex + 1;
      lastRevengedRef.current = null;

      if (nextIndex < queue.length) {
        setCurrentIndex(nextIndex);
        return;
      }

      // メインフェーズ末端に達した。サマリーフェーズへの移行を判定。
      maybeStartSummaryPhase(nextIndex, nextMainMistakes);
      return;
    }

    // 不正解
    // 即時リベンジ
    if (opts.immediate && lastRevengedRef.current !== current) {
      // 現在位置の直後に同じ問題を挿入
      lastRevengedRef.current = current;
      setQueue((prev) => {
        const next = [...prev];
        next.splice(currentIndex + 1, 0, current);
        return next;
      });
      setCurrentIndex(currentIndex + 1);
      return;
    }

    // 即時リベンジしない場合は、そのまま次へ進む
    const nextIndex = currentIndex + 1;
    lastRevengedRef.current = null;

    if (nextIndex < queue.length) {
      setCurrentIndex(nextIndex);
      return;
    }

    // メインフェーズ末端に達した（最終問題で不正解 + リベンジしない場合もここに来る）
    maybeStartSummaryPhase(nextIndex, nextMainMistakes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, currentIndex, phase, mainMistakes]);

  // メインフェーズ末端で、必要ならサマリーフェーズを開始する。
  // 始めない場合は単に currentIndex を末端へ進めて isFinished にする。
  //
  // currentMistakes は「今回のミスも含めた」最新のミスリスト。
  // React の state バッチ更新で setMainMistakes 直後に mainMistakes を読むと
  // 古い値が見えるため、呼び出し側でローカル変数として渡してもらう。
  function maybeStartSummaryPhase(nextIndex, currentMistakes) {
    const opts = optionsRef.current;
    // サマリーフェーズは「メインフェーズ末端のとき」だけ立ち上げる。
    // すでに summary フェーズの場合は再帰させない（無限ループ防止）。
    if (phase === 'main' && opts.summary && currentMistakes.length > 0) {
      // サマリーフェーズへ移行：間違えた問題のユニーク集合をシャッフルして追加
      const summaryQuestions = shuffle(currentMistakes);
      lastRevengedRef.current = null;
      setQueue((prev) => [...prev, ...summaryQuestions]);
      setPhase('summary');
      setCurrentIndex(nextIndex);
      return;
    }
    // サマリーを始めない（または既にサマリー中）→ 完全終了
    setCurrentIndex(nextIndex);
  }

  const getMistakeSummary = useCallback(() => {
    return mainMistakes.slice();
  }, [mainMistakes]);

  return useMemo(
    () => ({
      currentQuestion,
      currentIndex,
      totalCount,
      isFinished,
      phase,
      handleResult,
      getMistakeSummary,
    }),
    [currentQuestion, currentIndex, totalCount, isFinished, phase, handleResult, getMistakeSummary]
  );
}
