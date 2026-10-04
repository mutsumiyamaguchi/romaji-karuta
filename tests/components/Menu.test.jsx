import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Menu from '../../src/components/Menu.jsx';
import { rows, romajiList } from '../../src/data/romaji.js';

const progressWith = (access) => ({
  access: rows.map((row) => {
    const item = romajiList.find((entry) => entry.row === row);
    return { unitId: `${item.step}:${row}`, access: access(item.step, row) };
  }),
});

const openProgress = progressWith(() => 'available');
const newStudentProgress = progressWith((step) =>
  step === 'seion' ? 'available' : 'locked'
);
const legacyProgress = progressWith((step) =>
  step === 'seion' ? 'available' : 'legacy-preview'
);

describe('<Menu />', () => {
  it('displays lifetime and available points', () => {
    render(<Menu points={42} availablePoints={17} onStart={() => {}} />);
    expect(screen.getByText('ごうけい 42')).toBeInTheDocument();
    expect(screen.getByText('つかえる 17')).toBeInTheDocument();
  });

  it('places the student and points inside a normal-flow header before mode tabs', () => {
    render(<Menu points={42} currentStudent={{ id: 's1', name: 'たろう' }} onStart={() => {}} />);
    const header = screen.getByTestId('menu-header');
    const student = screen.getByTestId('student-picker');
    const points = screen.getByTestId('points-badge');
    const modeTabs = screen.getByTestId('mode-tabs');

    expect(header).toContainElement(student);
    expect(header).toContainElement(points);
    expect(header).not.toHaveClass('absolute');
    expect(header.compareDocumentPosition(modeTabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows only step 1 rows initially', () => {
    render(<Menu points={0} progress={openProgress} onStart={() => {}} />);
    expect(screen.getByRole('button', { name: /^あ ぎょう/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^わ ぎょう/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /が ぎょう/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /きゃ ぎょう/ })).not.toBeInTheDocument();
  });

  it('switches the visible rows with the selected step tab', async () => {
    const user = userEvent.setup();
    render(<Menu points={0} progress={openProgress} onStart={() => {}} />);
    await user.click(screen.getByRole('tab', { name: /ステップ2/ }));
    expect(screen.getByRole('button', { name: /^が ぎょう/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^小さいつ ぎょう/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^あ ぎょう/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /きゃ ぎょう/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /ステップ3/ }));
    expect(screen.getByRole('button', { name: /^きゃ ぎょう/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /が ぎょう/ })).not.toBeInTheDocument();
  });

  it('shows locked rows and unlock guidance for an unreached step', async () => {
    const user = userEvent.setup();
    render(<Menu points={0} progress={newStudentProgress} onStart={() => {}} />);
    await user.click(screen.getByRole('tab', { name: /ステップ2/ }));
    expect(screen.getByText(/前のステップの うでだめし/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /が ぎょう ロック/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /ランダム15もん/ })).toBeDisabled();
  });

  it('keeps legacy preview rows selectable without points', async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<Menu points={0} progress={legacyProgress} onStart={onStart} />);
    await user.click(screen.getByRole('tab', { name: /ステップ2/ }));
    expect(screen.getByText(/さきどりれんしゅう中は ポイントは つかない/)).toBeInTheDocument();
    const rowButton = screen.getByRole('button', { name: /が ぎょう さきどりれんしゅう/ });
    expect(rowButton).toBeEnabled();
    await user.click(rowButton);
    expect(onStart).toHaveBeenCalledWith('が', 'h2r', 'upper');
  });

  it('starts random practice for the selected step', async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<Menu points={0} progress={openProgress} onStart={onStart} />);
    await user.click(screen.getByRole('tab', { name: /ステップ3/ }));
    await user.click(screen.getByRole('button', { name: /ようおん から ランダム15もん/ }));
    expect(onStart).toHaveBeenCalledWith('random-youon', 'h2r', 'upper');
  });

  it('calls onStart with the selected row', async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<Menu points={0} progress={openProgress} onStart={onStart} />);
    await user.click(screen.getByRole('button', { name: /^あ ぎょう/ }));
    expect(onStart).toHaveBeenCalledWith('あ', 'h2r', 'upper');
  });

  it('marks rows that already earned points and rows that still can', () => {
    const progress = { ...newStudentProgress, practiceCompletions: [{ unit_id: 'seion:あ', reward: 100 }] };
    render(<Menu points={100} progress={progress} onStart={() => {}} />);
    const cleared = screen.getByRole('button', { name: /^あ ぎょう/ });
    const pending = screen.getByRole('button', { name: /^か ぎょう/ });
    expect(cleared).toHaveTextContent('クリア');
    expect(cleared).toHaveAttribute('data-cleared', 'true');
    expect(cleared).not.toHaveTextContent('+100');
    expect(pending).toHaveTextContent('+100');
    expect(pending).toHaveAttribute('data-cleared', 'false');
    expect(screen.getByTestId('clear-status')).toHaveTextContent('クリア 1 / 10');
  });

  it('announces that every row is cleared', () => {
    const practiceCompletions = rows
      .filter((row) => romajiList.some((item) => item.row === row && item.step === 'seion'))
      .map((row) => ({ unit_id: `seion:${row}`, reward: 100 }));
    render(<Menu points={1000} progress={{ ...newStudentProgress, practiceCompletions }} onStart={() => {}} />);
    expect(screen.getByTestId('clear-status')).toHaveTextContent('クリア 10 / 10');
    expect(screen.getByTestId('clear-status')).toHaveTextContent('うでだめしに ちょうせん');
  });

  it('hides reward marks during legacy preview and on locked steps', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Menu points={0} progress={legacyProgress} onStart={() => {}} />);
    await user.click(screen.getByRole('tab', { name: /ステップ2/ }));
    expect(screen.queryByTestId('clear-status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^が ぎょう/ })).not.toHaveTextContent('+125');
    unmount();
    render(<Menu points={0} progress={newStudentProgress} onStart={() => {}} />);
    await user.click(screen.getByRole('tab', { name: /ステップ2/ }));
    expect(screen.queryByTestId('clear-status')).not.toBeInTheDocument();
  });

  it('shows the title and prompt copy', () => {
    render(<Menu points={0} onStart={() => {}} />);
    expect(screen.getByText('ローマじ かるた')).toBeInTheDocument();
    expect(screen.getByText('れんしゅうする ぎょうを えらんでね！')).toBeInTheDocument();
  });
});
