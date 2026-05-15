import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import PlayContainer from '../../src/components/PlayContainer.jsx';

// PlayContainer の統合テスト（リベンジ組込み）
//   useRevenge を内部で使い、UI 表示は Play へ委譲する。
//   既存 Play は presentational なまま維持されているため、Play.test.jsx の挙動は壊れない。

const Q = (h, r, row = 'あ') => ({ h, r, row });

// 「もんめ」のテキストから現在/総問題数を抽出するヘルパー
const readProgress = () => {
  const node = screen.getByText(/もんめ/);
  const m = node.textContent.match(/(\d+)\s*\/\s*(\d+)/);
  return { current: Number(m[1]), total: Number(m[2]) };
};

const clickWrong = (currentR) => {
  // 出題されている r 以外のボタンをクリックして不正解にする
  const buttons = screen.getAllByRole('button');
  const wrong = buttons.find(
    (b) => /^[a-z]+$/.test(b.textContent ?? '') && b.textContent !== currentR
  );
  act(() => {
    wrong.click();
  });
};

const clickRight = (currentR) => {
  const btn = screen.getByRole('button', { name: currentR });
  act(() => {
    btn.click();
  });
};

// 現在出題中の問題の r を取得（h2r モード時、問題プロンプトのひらがなから逆引き）
const currentR = (questions) => {
  // 問題プロンプトのひらがな（札ボタン以外の場所）を、questions の h と一致するものから探す
  for (const q of questions) {
    if (screen.queryAllByText(q.h).length > 0) {
      return q.r;
    }
  }
  return null;
};

describe('<PlayContainer />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does an immediate revenge: the same question is re-asked right after a mistake (immediate ON)', () => {
    const questions = [Q('か', 'ka'), Q('き', 'ki'), Q('く', 'ku')];
    render(
      <PlayContainer
        initialQuestions={questions}
        points={0}
        mode="h2r"
        revengeOptions={{ immediate: true, summary: false }}
        onFinished={() => {}}
        onPointsChange={() => {}}
        onBack={() => {}}
      />
    );

    // 1問目は「か」
    expect(screen.getByText('か')).toBeInTheDocument();
    expect(readProgress()).toEqual({ current: 1, total: 3 });

    // 「か」（ka）以外をクリック → 不正解
    clickWrong('ka');

    // フィードバック表示中
    expect(screen.getByText('ざんねん！')).toBeInTheDocument();

    // 2.5 秒経過で進行
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    // 同じ「か」が再出題される（即時リベンジ）
    expect(screen.getByText('か')).toBeInTheDocument();
    // 総問題数が増えている（リベンジ追加で 3 → 4）
    expect(readProgress()).toEqual({ current: 2, total: 4 });
  });

  it('starts a summary phase after the main session with the mistakes (summary ON)', () => {
    const onFinished = vi.fn();
    const questions = [Q('か', 'ka'), Q('き', 'ki'), Q('く', 'ku'), Q('け', 'ke')];
    render(
      <PlayContainer
        initialQuestions={questions}
        points={0}
        mode="h2r"
        revengeOptions={{ immediate: false, summary: true }}
        onFinished={onFinished}
        onPointsChange={() => {}}
        onBack={() => {}}
      />
    );

    // 1問目「か」: 不正解
    clickWrong('ka');
    act(() => { vi.advanceTimersByTime(2500); });
    // 2問目「き」: 正解
    clickRight('ki');
    act(() => { vi.advanceTimersByTime(2500); });
    // 3問目「く」: 不正解
    clickWrong('ku');
    act(() => { vi.advanceTimersByTime(2500); });
    // 4問目「け」: 正解
    clickRight('ke');
    act(() => { vi.advanceTimersByTime(2500); });

    // ここでサマリーフェーズが開始される → 「もういっかい！」演出が一時表示
    expect(screen.getByText(/もういっかい/)).toBeInTheDocument();

    // 1.5 秒経過すると演出が消える
    act(() => { vi.advanceTimersByTime(1500); });
    expect(screen.queryByText(/もういっかい/)).not.toBeInTheDocument();

    // サマリーには「か」「く」の 2 問
    // 1問解いて次に進む
    const seen = new Set();
    seen.add(currentR(questions));
    const first = currentR(questions);
    clickRight(first);
    act(() => { vi.advanceTimersByTime(2500); });
    seen.add(currentR(questions));
    const second = currentR(questions);
    clickRight(second);
    act(() => { vi.advanceTimersByTime(2500); });

    // ka と ku が含まれる
    expect(seen).toEqual(new Set(['ka', 'ku']));

    // 終了 → onFinished が呼ばれる
    expect(onFinished).toHaveBeenCalledOnce();
    const mistakes = onFinished.mock.calls[0][0];
    expect(mistakes.map((q) => q.h).sort()).toEqual(['か', 'く']);
  });

  it('finishes without summary when both immediate and summary are OFF', () => {
    const onFinished = vi.fn();
    const questions = [Q('か', 'ka'), Q('き', 'ki'), Q('く', 'ku')];
    render(
      <PlayContainer
        initialQuestions={questions}
        points={0}
        mode="h2r"
        revengeOptions={{ immediate: false, summary: false }}
        onFinished={onFinished}
        onPointsChange={() => {}}
        onBack={() => {}}
      />
    );

    // 3問全部間違える
    clickWrong('ka');
    act(() => { vi.advanceTimersByTime(2500); });
    clickWrong('ki');
    act(() => { vi.advanceTimersByTime(2500); });
    clickWrong('ku');
    act(() => { vi.advanceTimersByTime(2500); });

    // 全 3 問終わったら onFinished
    expect(onFinished).toHaveBeenCalledOnce();
    const mistakes = onFinished.mock.calls[0][0];
    expect(mistakes.map((q) => q.h)).toEqual(['か', 'き', 'く']);
  });

  it('finishes with empty mistakes when every question is correct', () => {
    const onFinished = vi.fn();
    const questions = [Q('か', 'ka'), Q('き', 'ki')];
    render(
      <PlayContainer
        initialQuestions={questions}
        points={0}
        mode="h2r"
        revengeOptions={{ immediate: true, summary: true }}
        onFinished={onFinished}
        onPointsChange={() => {}}
        onBack={() => {}}
      />
    );

    clickRight('ka');
    act(() => { vi.advanceTimersByTime(2500); });
    clickRight('ki');
    act(() => { vi.advanceTimersByTime(2500); });

    expect(onFinished).toHaveBeenCalledOnce();
    expect(onFinished.mock.calls[0][0]).toEqual([]);
  });

  it('updates the totalCount in the progress indicator when a revenge is added', () => {
    const questions = [Q('か', 'ka'), Q('き', 'ki')];
    render(
      <PlayContainer
        initialQuestions={questions}
        points={0}
        mode="h2r"
        revengeOptions={{ immediate: true, summary: false }}
        onFinished={() => {}}
        onPointsChange={() => {}}
        onBack={() => {}}
      />
    );

    expect(readProgress()).toEqual({ current: 1, total: 2 });

    // 1問目で不正解 → リベンジ追加
    clickWrong('ka');
    act(() => { vi.advanceTimersByTime(2500); });

    expect(readProgress()).toEqual({ current: 2, total: 3 });
  });

  it('ignores additional clicks while feedback animation is showing', () => {
    const onPointsChange = vi.fn();
    const questions = [Q('か', 'ka'), Q('き', 'ki')];
    render(
      <PlayContainer
        initialQuestions={questions}
        points={0}
        mode="h2r"
        revengeOptions={{ immediate: false, summary: false }}
        onFinished={() => {}}
        onPointsChange={onPointsChange}
        onBack={() => {}}
      />
    );

    // 正解クリック
    clickRight('ka');
    expect(screen.getByText('せいかい！')).toBeInTheDocument();
    expect(onPointsChange).toHaveBeenCalledTimes(1); // +10

    // フィードバック中にもう一回クリックしても無視される
    const otherBtn = screen
      .getAllByRole('button')
      .find((b) => /^[a-z]+$/.test(b.textContent ?? '') && b.textContent !== 'ka');
    act(() => { otherBtn.click(); });
    expect(onPointsChange).toHaveBeenCalledTimes(1);
  });

  it('awards +10 points for a revenge-correct answer too', () => {
    const onPointsChange = vi.fn();
    const questions = [Q('か', 'ka'), Q('き', 'ki')];
    render(
      <PlayContainer
        initialQuestions={questions}
        points={0}
        mode="h2r"
        revengeOptions={{ immediate: true, summary: false }}
        onFinished={() => {}}
        onPointsChange={onPointsChange}
        onBack={() => {}}
      />
    );

    // 1問目で不正解 → リベンジ
    clickWrong('ka');
    act(() => { vi.advanceTimersByTime(2500); });
    // リベンジで正解 → +10
    clickRight('ka');
    expect(onPointsChange).toHaveBeenCalledWith(10);
    act(() => { vi.advanceTimersByTime(2500); });

    // 続けて 2 問目「き」を正解 → さらに +10
    clickRight('ki');
    expect(onPointsChange).toHaveBeenCalledTimes(2);
  });
});
