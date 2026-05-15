import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRevenge } from '../../src/lib/useRevenge.js';

// useRevenge のリグレッションテスト
//   レビューで発見した「最終問題で初めて間違えた場合のサマリーフェーズ移行漏れ」を防ぐ。
//   原因: setMainMistakes の直後に mainMistakes を読むと React のバッチ更新で古い値が見える。
//   対策: ローカル変数で「今回のミスを含めた」mainMistakes を maybeStartSummaryPhase に渡す。
describe('useRevenge - last-question mistake → summary phase', () => {
  it('starts summary when ONLY the last question is missed (immediate OFF)', () => {
    const qs = [
      { h: 'あ', r: 'a', row: 'あ' },
      { h: 'い', r: 'i', row: 'あ' },
    ];
    const { result } = renderHook(() => useRevenge(qs, { immediate: false, summary: true }));

    // 1問目正解、2問目（最終）で初めて不正解
    act(() => { result.current.handleResult(true); });
    act(() => { result.current.handleResult(false); });

    // サマリーフェーズに移行すべき（最後の問題で間違えたので、それがサマリーに入る）
    expect(result.current.phase).toBe('summary');
    expect(result.current.isFinished).toBe(false);
    expect(result.current.currentQuestion?.h).toBe('い');
  });

  it('starts summary when ONLY the last question is missed (immediate ON, but no double-revenge)', () => {
    const qs = [
      { h: 'あ', r: 'a', row: 'あ' },
      { h: 'い', r: 'i', row: 'あ' },
    ];
    const { result } = renderHook(() => useRevenge(qs, { immediate: true, summary: true }));

    // 1問目正解、2問目（最終）で初めて不正解 → 即時リベンジで再出題
    act(() => { result.current.handleResult(true); });
    act(() => { result.current.handleResult(false); });
    // ここで「い」が即時リベンジで再出題されている（最後の問題でも）
    expect(result.current.currentQuestion?.h).toBe('い');
    expect(result.current.phase).toBe('main');

    // リベンジ正解
    act(() => { result.current.handleResult(true); });
    // サマリーフェーズへ
    expect(result.current.phase).toBe('summary');
    expect(result.current.currentQuestion?.h).toBe('い');
  });
});
