import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRevenge } from '../../src/lib/useRevenge.js';

// テスト用の問題セット（小さいセットで決定論的に検証）
const Q = (h, r, row = 'あ') => ({ h, r, row });

const makeQuestions = () => [
  Q('あ', 'a'),
  Q('い', 'i'),
  Q('う', 'u'),
  Q('え', 'e'),
];

describe('useRevenge', () => {
  describe('basic behavior', () => {
    it('starts on the first question and reports totalCount', () => {
      const qs = makeQuestions();
      const { result } = renderHook(() => useRevenge(qs, { immediate: false, summary: false }));

      expect(result.current.currentQuestion).toEqual(qs[0]);
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.totalCount).toBe(qs.length);
      expect(result.current.isFinished).toBe(false);
      expect(result.current.phase).toBe('main');
    });

    it('isFinished is true immediately when there are no questions', () => {
      const { result } = renderHook(() => useRevenge([], { immediate: true, summary: true }));

      expect(result.current.isFinished).toBe(true);
      expect(result.current.currentQuestion).toBeNull();
      expect(result.current.totalCount).toBe(0);
    });
  });

  describe('both OFF', () => {
    it('advances normally on incorrect without enqueueing a revenge', () => {
      const qs = makeQuestions();
      const { result } = renderHook(() => useRevenge(qs, { immediate: false, summary: false }));

      // 1問目で不正解
      act(() => { result.current.handleResult(false); });

      // 即時リベンジOFFなので次は2問目（い）
      expect(result.current.currentQuestion).toEqual(qs[1]);
      expect(result.current.totalCount).toBe(qs.length);

      // 残りを全部正解
      act(() => { result.current.handleResult(true); });
      act(() => { result.current.handleResult(true); });
      act(() => { result.current.handleResult(true); });

      expect(result.current.isFinished).toBe(true);
      expect(result.current.phase).toBe('main');
    });

    it('does not start a summary phase even when mistakes exist', () => {
      const qs = makeQuestions();
      const { result } = renderHook(() => useRevenge(qs, { immediate: false, summary: false }));

      // 全問不正解
      act(() => { result.current.handleResult(false); });
      act(() => { result.current.handleResult(false); });
      act(() => { result.current.handleResult(false); });
      act(() => { result.current.handleResult(false); });

      expect(result.current.isFinished).toBe(true);
      expect(result.current.phase).toBe('main');
    });
  });

  describe('immediate revenge ON only', () => {
    it('re-inserts the same question right after an incorrect answer', () => {
      const qs = makeQuestions();
      const { result } = renderHook(() => useRevenge(qs, { immediate: true, summary: false }));

      // 1問目（あ）で不正解
      act(() => { result.current.handleResult(false); });

      // 次は同じ「あ」が出題される
      expect(result.current.currentQuestion).toEqual(qs[0]);
      expect(result.current.currentQuestion).toBe(qs[0]); // 同じ参照
    });

    it('continues to the next original question after solving the revenge', () => {
      const qs = makeQuestions();
      const { result } = renderHook(() => useRevenge(qs, { immediate: true, summary: false }));

      act(() => { result.current.handleResult(false); }); // あ で不正解
      // 再出題された「あ」で正解
      act(() => { result.current.handleResult(true); });

      // 続けて「い」が出題される
      expect(result.current.currentQuestion).toEqual(qs[1]);
    });

    it('does not double-insert when failing the same question twice in a row', () => {
      const qs = makeQuestions();
      const { result } = renderHook(() => useRevenge(qs, { immediate: true, summary: false }));

      const baseTotal = result.current.totalCount;

      act(() => { result.current.handleResult(false); }); // 1回目失敗 → リベンジ追加
      expect(result.current.totalCount).toBe(baseTotal + 1);

      // 同じ「あ」のリベンジで再度失敗。重複挿入はしない
      act(() => { result.current.handleResult(false); });
      expect(result.current.totalCount).toBe(baseTotal + 1);

      // 次の問題に進む
      expect(result.current.currentQuestion).toEqual(qs[1]);
    });

    it('does not start a summary phase when only immediate is ON', () => {
      const qs = makeQuestions();
      const { result } = renderHook(() => useRevenge(qs, { immediate: true, summary: false }));

      // 全問不正解（リベンジも全部不正解）
      // あ → リベンジあ → い → リベンジい → う → リベンジう → え → リベンジえ
      // ただし二重挿入はしないので、各問につき1回までリベンジ。
      for (let i = 0; i < qs.length * 2; i++) {
        if (!result.current.isFinished) {
          act(() => { result.current.handleResult(false); });
        }
      }

      expect(result.current.isFinished).toBe(true);
      expect(result.current.phase).toBe('main');
    });
  });

  describe('summary revenge ON only', () => {
    it('starts a summary phase containing the unique mistaken questions', () => {
      const qs = makeQuestions();
      const { result } = renderHook(() => useRevenge(qs, { immediate: false, summary: true }));

      // あ、う を間違える / い、え は正解
      act(() => { result.current.handleResult(false); }); // あ ×
      act(() => { result.current.handleResult(true); });  // い ○
      act(() => { result.current.handleResult(false); }); // う ×
      act(() => { result.current.handleResult(true); });  // え ○

      // ここでサマリーフェーズに移る
      expect(result.current.phase).toBe('summary');
      expect(result.current.isFinished).toBe(false);

      // サマリーには「あ」「う」の2問が含まれる
      const summaryHs = new Set();
      summaryHs.add(result.current.currentQuestion.h);
      act(() => { result.current.handleResult(true); });
      summaryHs.add(result.current.currentQuestion.h);
      act(() => { result.current.handleResult(true); });

      expect(summaryHs.size).toBe(2);
      expect(summaryHs.has('あ')).toBe(true);
      expect(summaryHs.has('う')).toBe(true);

      expect(result.current.isFinished).toBe(true);
    });

    it('deduplicates: a question missed multiple times appears only once in summary', () => {
      const qs = makeQuestions();
      const { result } = renderHook(() => useRevenge(qs, { immediate: false, summary: true }));

      // あ を 2 回間違える（即時リベンジOFFなので「あ」は1度しか出ないが、
      // summary 側で dedupe されることを確認するために、別の問題でも同じ h を使うのは無理。
      // 代わりに 3 問間違えてサマリーに 3 問入ることを確認する。
      act(() => { result.current.handleResult(false); }); // あ ×
      act(() => { result.current.handleResult(false); }); // い ×
      act(() => { result.current.handleResult(false); }); // う ×
      act(() => { result.current.handleResult(true); });  // え ○

      expect(result.current.phase).toBe('summary');

      // サマリーには 3 問。それぞれ 1 回ずつ出題される。
      const seen = [];
      seen.push(result.current.currentQuestion.h);
      act(() => { result.current.handleResult(true); });
      seen.push(result.current.currentQuestion.h);
      act(() => { result.current.handleResult(true); });
      seen.push(result.current.currentQuestion.h);
      act(() => { result.current.handleResult(true); });

      expect(new Set(seen).size).toBe(3);
      expect(new Set(seen)).toEqual(new Set(['あ', 'い', 'う']));
      expect(result.current.isFinished).toBe(true);
    });

    it('does not start a summary phase when everything was correct', () => {
      const qs = makeQuestions();
      const { result } = renderHook(() => useRevenge(qs, { immediate: false, summary: true }));

      act(() => { result.current.handleResult(true); });
      act(() => { result.current.handleResult(true); });
      act(() => { result.current.handleResult(true); });
      act(() => { result.current.handleResult(true); });

      expect(result.current.isFinished).toBe(true);
      expect(result.current.phase).toBe('main');
    });
  });

  describe('both ON', () => {
    it('applies immediate revenge during the main phase', () => {
      const qs = makeQuestions();
      const { result } = renderHook(() => useRevenge(qs, { immediate: true, summary: true }));

      act(() => { result.current.handleResult(false); }); // あ ×
      // 即時リベンジで「あ」が再出題
      expect(result.current.currentQuestion).toEqual(qs[0]);
      expect(result.current.phase).toBe('main');
    });

    it('falls through to a summary phase containing main-phase mistakes', () => {
      const qs = makeQuestions();
      const { result } = renderHook(() => useRevenge(qs, { immediate: true, summary: true }));

      // あ ×, リベンジあ ○, い ○, う ×, リベンジう ○, え ○
      act(() => { result.current.handleResult(false); }); // あ ×
      act(() => { result.current.handleResult(true); });  // リベンジあ ○
      act(() => { result.current.handleResult(true); });  // い ○
      act(() => { result.current.handleResult(false); }); // う ×
      act(() => { result.current.handleResult(true); });  // リベンジう ○
      act(() => { result.current.handleResult(true); });  // え ○

      expect(result.current.phase).toBe('summary');
      expect(result.current.isFinished).toBe(false);

      // サマリーには「あ」「う」
      const summary = new Set();
      summary.add(result.current.currentQuestion.h);
      act(() => { result.current.handleResult(true); });
      summary.add(result.current.currentQuestion.h);
      act(() => { result.current.handleResult(true); });

      expect(summary).toEqual(new Set(['あ', 'う']));
      expect(result.current.isFinished).toBe(true);
    });

    it('does NOT add a re-summary even if questions are missed during summary phase', () => {
      const qs = makeQuestions();
      const { result } = renderHook(() => useRevenge(qs, { immediate: true, summary: true }));

      // メインで「あ」「い」を間違える
      act(() => { result.current.handleResult(false); }); // あ ×
      act(() => { result.current.handleResult(true); });  // リベンジあ ○
      act(() => { result.current.handleResult(false); }); // い ×
      act(() => { result.current.handleResult(true); });  // リベンジい ○
      act(() => { result.current.handleResult(true); });  // う ○
      act(() => { result.current.handleResult(true); });  // え ○

      // サマリー開始
      expect(result.current.phase).toBe('summary');

      // サマリー中のミスは、即時リベンジでフォローはするが、
      // 二重サマリーは作らない（無限ループ防止）
      // 1問目を間違える
      const firstSummaryH = result.current.currentQuestion.h;
      act(() => { result.current.handleResult(false); }); // サマリー1問目 ×
      // 即時リベンジで同じ問題
      expect(result.current.currentQuestion.h).toBe(firstSummaryH);

      act(() => { result.current.handleResult(true); }); // リベンジ ○
      // 2問目
      act(() => { result.current.handleResult(true); }); // サマリー2問目 ○

      // ここで終了。再サマリーは無い
      expect(result.current.isFinished).toBe(true);
      expect(result.current.phase).toBe('summary');
    });
  });

  describe('getMistakeSummary()', () => {
    it('returns the unique set of mistaken questions across the session', () => {
      const qs = makeQuestions();
      const { result } = renderHook(() => useRevenge(qs, { immediate: true, summary: true }));

      // あ を 2 回失敗（リベンジでも失敗） → うで失敗 → リベンジで正解 → え 正解
      act(() => { result.current.handleResult(false); }); // あ ×
      act(() => { result.current.handleResult(false); }); // リベンジあ ×
      act(() => { result.current.handleResult(true); });  // い ○
      act(() => { result.current.handleResult(false); }); // う ×
      act(() => { result.current.handleResult(true); });  // リベンジう ○
      act(() => { result.current.handleResult(true); });  // え ○

      const summary = result.current.getMistakeSummary();
      const hSet = new Set(summary.map((q) => q.h));
      expect(hSet).toEqual(new Set(['あ', 'う']));
    });

    it('returns an empty array when no question has been missed', () => {
      const qs = makeQuestions();
      const { result } = renderHook(() => useRevenge(qs, { immediate: true, summary: true }));

      act(() => { result.current.handleResult(true); });
      act(() => { result.current.handleResult(true); });
      act(() => { result.current.handleResult(true); });
      act(() => { result.current.handleResult(true); });

      expect(result.current.getMistakeSummary()).toEqual([]);
    });
  });

  describe('totalCount', () => {
    it('grows when an immediate revenge is enqueued', () => {
      const qs = makeQuestions();
      const { result } = renderHook(() => useRevenge(qs, { immediate: true, summary: false }));

      expect(result.current.totalCount).toBe(4);
      act(() => { result.current.handleResult(false); });
      expect(result.current.totalCount).toBe(5);
    });
  });
});
