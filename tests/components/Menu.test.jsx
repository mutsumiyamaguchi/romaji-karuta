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

  it('shows only step 1 rows initially', () => {
    render(<Menu points={0} progress={openProgress} onStart={() => {}} />);
    expect(screen.getByRole('button', { name: 'あ ぎょう' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'わ ぎょう' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /が ぎょう/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /きゃ ぎょう/ })).not.toBeInTheDocument();
  });

  it('switches the visible rows with the selected step tab', async () => {
    const user = userEvent.setup();
    render(<Menu points={0} progress={openProgress} onStart={() => {}} />);
    await user.click(screen.getByRole('tab', { name: /ステップ2/ }));
    expect(screen.getByRole('button', { name: 'が ぎょう' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '小さいつ ぎょう' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'あ ぎょう', exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /きゃ ぎょう/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /ステップ3/ }));
    expect(screen.getByRole('button', { name: 'きゃ ぎょう' })).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: 'あ ぎょう' }));
    expect(onStart).toHaveBeenCalledWith('あ', 'h2r', 'upper');
  });

  it('shows the title and prompt copy', () => {
    render(<Menu points={0} onStart={() => {}} />);
    expect(screen.getByText('ローマじ かるた')).toBeInTheDocument();
    expect(screen.getByText('れんしゅうする ぎょうを えらんでね！')).toBeInTheDocument();
  });
});
