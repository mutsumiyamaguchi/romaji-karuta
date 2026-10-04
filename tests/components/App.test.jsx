import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// App.jsx の async ブートフロー（D1 移行後）に対する統合テスト。
//   - mentor/students API を vi.mock で差し替え、起動シーケンスを支配する
//   - 3 つの画面（Loading / Error / Setup / Menu）への分岐を網羅する
//
// 設計判断:
//   - apiClient.js の fetch をモックするのではなく、src/lib/api/* モジュール単位で
//     vi.mock する。これにより HTTP レイヤの実装変更（fetch → axios 等）に
//     テストが引きずられない。
//   - vi.hoisted で mock 関数を巻き上げ、各テストで beforeEach に挙動を割り当てる。

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getStatus: vi.fn(),
    initPin: vi.fn(),
    listStudents: vi.fn(),
    createStudent: vi.fn(),
    getPoints: vi.fn(),
    addPoints: vi.fn(),
    getProgress: vi.fn(),
    getWeakCharacters: vi.fn(),
    listMistakes: vi.fn(),
    recordMistake: vi.fn(),
  },
}));

vi.mock('../../src/lib/api/mentor.js', () => ({
  getStatus: mocks.getStatus,
  initPin: mocks.initPin,
  login: vi.fn(),
  changePin: vi.fn(),
}));

vi.mock('../../src/lib/api/students.js', () => ({
  listStudents: mocks.listStudents,
  createStudent: mocks.createStudent,
  deleteStudent: vi.fn(),
}));

vi.mock('../../src/lib/api/points.js', () => ({
  getPoints: mocks.getPoints,
  addPoints: mocks.addPoints,
}));

vi.mock('../../src/lib/api/mistakes.js', () => ({
  listMistakes: mocks.listMistakes,
  recordMistake: mocks.recordMistake,
  getWeakCharacters: mocks.getWeakCharacters,
}));
vi.mock('../../src/lib/api/progress.js', () => ({
  getProgress: mocks.getProgress,
  completePractice: vi.fn(),
  unlockAssessment: vi.fn(),
  startAssessment: vi.fn(),
  answerAssessment: vi.fn(),
}));

// モック宣言後に import（hoist された vi.mock が先に効くため動的 import は不要だが、
// 念のため top-level import を使い、Vitest の hoist に任せる）
import App from '../../src/App.jsx';

describe('<App /> async boot', () => {
  beforeEach(() => {
    localStorage.clear();
    // デフォルトの振る舞いをリセット
    for (const fn of Object.values(mocks)) fn.mockReset();
    mocks.addPoints.mockResolvedValue({ id: 's1', points: 0 });
    mocks.getWeakCharacters.mockResolvedValue([]);
    mocks.listMistakes.mockResolvedValue([]);
    mocks.initPin.mockResolvedValue({});
    mocks.createStudent.mockResolvedValue({});
    mocks.getProgress.mockResolvedValue({ totalPoints: 0, availablePoints: 0, passedSteps: [], access: [], assessments: [] });
  });

  it('shows the loading screen first, then SetupScreen when mentor is not initialized', async () => {
    mocks.getStatus.mockResolvedValue(false);
    mocks.listStudents.mockResolvedValue([]);

    render(<App />);

    // 起動直後はローディング表示（async 解決前）
    expect(screen.getByText('よみこみちゅう…')).toBeInTheDocument();

    // ブート完了後は SetupScreen が出る
    await waitFor(() => {
      expect(screen.getByText('はじめてのセットアップ')).toBeInTheDocument();
    });
    // ローディングは消えている
    expect(screen.queryByText('よみこみちゅう…')).not.toBeInTheDocument();
    // getPoints は呼ばれない（生徒が未確定なので）
    expect(mocks.getPoints).not.toHaveBeenCalled();
  });

  it('shows SetupScreen when mentor is initialized but no students exist', async () => {
    mocks.getStatus.mockResolvedValue(true);
    mocks.listStudents.mockResolvedValue([]);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('はじめてのセットアップ')).toBeInTheDocument();
    });
    // 生徒が居ない以上ポイント取得は走らない
    expect(mocks.getPoints).not.toHaveBeenCalled();
  });

  it('loads progress before leaving setup completion', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    mocks.getStatus.mockResolvedValue(false);
    mocks.listStudents.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'new', name: 'たろう', points: 0 }]);
    mocks.getProgress.mockResolvedValue({ totalPoints: 0, availablePoints: 0, passedSteps: [], access: [{ unitId: 'seion:あ', access: 'available' }], assessments: [] });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('はじめてのセットアップ');
    await user.type(screen.getByPlaceholderText('PIN (4けた)'), '1234');
    await user.type(screen.getByPlaceholderText('もういちど'), '1234');
    await user.click(screen.getByText('つぎへ'));
    await user.type(await screen.findByPlaceholderText('例: たろう'), 'たろう');
    await user.click(screen.getByText('はじめる'));
    await screen.findByText('ローマじ かるた');
    expect(mocks.getProgress).toHaveBeenCalledWith('new');
    expect(screen.getByRole('button', { name: /^あ ぎょう/ })).toBeEnabled();
  });

  it('shows Menu with the current student when setup is complete and students exist', async () => {
    mocks.getStatus.mockResolvedValue(true);
    mocks.listStudents.mockResolvedValue([
      { id: 's1', name: 'たろう', points: 0 },
      { id: 's2', name: 'はなこ', points: 50 },
    ]);
    mocks.getPoints.mockResolvedValue(120);
    mocks.getProgress.mockResolvedValue({ totalPoints: 120, availablePoints: 80, passedSteps: [], access: [], assessments: [] });

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText('れんしゅうする ぎょうを えらんでね！')
      ).toBeInTheDocument();
    });

    // Menu のタイトル
    expect(screen.getByText('ローマじ かるた')).toBeInTheDocument();
    // 現在の生徒名（バッジ）
    expect(screen.getByText('たろう')).toBeInTheDocument();
    // ポイントが反映されている（getPoints の戻り値）
    expect(screen.getByText('ごうけい 120')).toBeInTheDocument();
    // 最初の生徒 ID が currentStudent に固定される（localStorage 経由）
    expect(localStorage.getItem('romajiCurrentStudentId')).toBe('s1');
    // 1人目の生徒を引数に getPoints が呼ばれている
    expect(mocks.getPoints).toHaveBeenCalledWith('s1');
  });

  it('preserves the previously selected student from localStorage on boot', async () => {
    localStorage.setItem('romajiCurrentStudentId', 's2');
    mocks.getStatus.mockResolvedValue(true);
    mocks.listStudents.mockResolvedValue([
      { id: 's1', name: 'たろう', points: 0 },
      { id: 's2', name: 'はなこ', points: 50 },
    ]);
    mocks.getPoints.mockResolvedValue(50);
    mocks.getProgress.mockResolvedValue({ totalPoints: 50, availablePoints: 50, passedSteps: [], access: [], assessments: [] });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('はなこ')).toBeInTheDocument();
    });
    expect(screen.getByText('ごうけい 50')).toBeInTheDocument();
    expect(mocks.getPoints).toHaveBeenCalledWith('s2');
  });

  it('shows ErrorScreen when the boot API throws', async () => {
    mocks.getStatus.mockRejectedValue(new Error('network down'));
    mocks.listStudents.mockResolvedValue([]);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('つながらない みたい')).toBeInTheDocument();
    });
    // 詳細メッセージも露出される（小さく表示）
    expect(screen.getByText(/network down/)).toBeInTheDocument();
    // 「もういちど」リトライボタンが存在する
    expect(
      screen.getByRole('button', { name: 'もういちど' })
    ).toBeInTheDocument();
  });

  it('fails closed when progress cannot be loaded', async () => {
    mocks.getStatus.mockResolvedValue(true);
    mocks.listStudents.mockResolvedValue([{ id: 's1', name: 'たろう', points: 0 }]);
    mocks.getPoints.mockResolvedValue(0);
    mocks.getProgress.mockRejectedValue(new Error('progress unavailable'));
    render(<App />);
    expect(await screen.findByText('つながらない みたい')).toBeInTheDocument();
    expect(screen.queryByText('れんしゅうする ぎょうを えらんでね！')).not.toBeInTheDocument();
  });

  it('clears old progress while switching students and does not reuse it on failure', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    mocks.getStatus.mockResolvedValue(true);
    mocks.listStudents.mockResolvedValue([{ id: 's1', name: 'たろう', points: 0 }, { id: 's2', name: 'はなこ', points: 0 }]);
    mocks.getPoints.mockResolvedValue(0);
    mocks.getProgress.mockResolvedValueOnce({ totalPoints: 0, availablePoints: 0, passedSteps: [], access: [{ unitId: 'seion:あ', access: 'available' }], assessments: [] }).mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('ローマじ かるた');
    await user.click(screen.getByRole('button', { name: /たろう/ }));
    await user.click(screen.getByRole('button', { name: /はなこ/ }));
    await waitFor(() => expect(screen.getByText('はなこ')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /^あ ぎょう/ })).toBeDisabled();
  });

  it('defaults letterCase to upper when localStorage has no saved value', async () => {
    mocks.getStatus.mockResolvedValue(true);
    mocks.listStudents.mockResolvedValue([
      { id: 's1', name: 'たろう', points: 0 },
    ]);
    mocks.getPoints.mockResolvedValue(0);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('ローマじ かるた')).toBeInTheDocument();
    });

    // 'ABC' トグルがアクティブ
    const upperBtn = screen.getByText('ABC').closest('button');
    const lowerBtn = screen.getByText('abc').closest('button');
    expect(upperBtn).toHaveAttribute('aria-pressed', 'true');
    expect(lowerBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('restores letterCase from localStorage on boot', async () => {
    localStorage.setItem('romajiLetterCase', 'lower');
    mocks.getStatus.mockResolvedValue(true);
    mocks.listStudents.mockResolvedValue([
      { id: 's1', name: 'たろう', points: 0 },
    ]);
    mocks.getPoints.mockResolvedValue(0);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('ローマじ かるた')).toBeInTheDocument();
    });

    const upperBtn = screen.getByText('ABC').closest('button');
    const lowerBtn = screen.getByText('abc').closest('button');
    expect(lowerBtn).toHaveAttribute('aria-pressed', 'true');
    expect(upperBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('persists letterCase to localStorage when the toggle is clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    mocks.getStatus.mockResolvedValue(true);
    mocks.listStudents.mockResolvedValue([
      { id: 's1', name: 'たろう', points: 0 },
    ]);
    mocks.getPoints.mockResolvedValue(0);

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('ローマじ かるた')).toBeInTheDocument();
    });

    const lowerBtn = screen.getByText('abc').closest('button');
    await user.click(lowerBtn);

    expect(localStorage.getItem('romajiLetterCase')).toBe('lower');
    expect(lowerBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the selected step tab after returning from practice to the menu', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const { CURRICULUM } = await import('../../src/data/curriculum.js');
    mocks.getStatus.mockResolvedValue(true);
    mocks.listStudents.mockResolvedValue([{ id: 's1', name: 'たろう', points: 0 }]);
    mocks.getPoints.mockResolvedValue(1000);
    mocks.getProgress.mockResolvedValue({
      totalPoints: 1000,
      availablePoints: 0,
      passedSteps: [1],
      practiceCompletions: [],
      assessments: [],
      access: CURRICULUM.flatMap((step) => step.units.map((unitId) => ({ unitId, step: step.number, access: 'available' }))),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('tab', { name: /ステップ2/ }));
    await user.click(screen.getByRole('button', { name: /^が ぎょう/ }));
    await user.click(await screen.findByTitle('メニューにもどる'));

    expect(await screen.findByRole('tab', { name: /ステップ2/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /^が ぎょう/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^あ ぎょう/ })).not.toBeInTheDocument();
  });
});
