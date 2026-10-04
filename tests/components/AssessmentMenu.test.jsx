import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AssessmentMenu from '../../src/components/AssessmentMenu.jsx';
import { CURRICULUM } from '../../src/data/curriculum.js';

const baseProgress = {
  totalPoints: 2000,
  availablePoints: 2000,
  passedSteps: [],
  practiceCompletions: [],
  assessments: [],
};

describe('<AssessmentMenu />', () => {
  it('requires every practice unit even when enough points are available', () => {
    render(<AssessmentMenu progress={baseProgress} onOpen={() => {}} onBack={() => {}} />);
    const step1 = screen.getByRole('button', { name: /ステップ1/ });
    expect(step1).toBeDisabled();
    expect(step1).toHaveTextContent('まず 10こ ぜんぶ クリア');
  });

  it('enables the assessment after every unit is complete and points are sufficient', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    const practiceCompletions = CURRICULUM[0].units.map((unit_id) => ({ unit_id }));
    render(
      <AssessmentMenu
        progress={{ ...baseProgress, practiceCompletions }}
        onOpen={onOpen}
        onBack={() => {}}
      />
    );
    const step1 = screen.getByRole('button', { name: /ステップ1/ });
    expect(step1).toBeEnabled();
    expect(step1).toHaveTextContent('1000ポイントで かいほう');
    // ポイント消費前に確認を挟む。押しただけでは始まらない。
    await user.click(step1);
    expect(onOpen).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('1000ポイント つかって');
    expect(dialog).toHaveTextContent('つかえるポイント 2000 → 1000');
    await user.click(screen.getByRole('button', { name: 'やめる' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onOpen).not.toHaveBeenCalled();
    await user.click(step1);
    await user.click(screen.getByRole('button', { name: 'はじめる' }));
    expect(onOpen).toHaveBeenCalledWith(1, false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('resumes an unlocked assessment without asking again', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(
      <AssessmentMenu
        progress={{ ...baseProgress, availablePoints: 0, assessments: [{ step: 1, status: 'in_progress' }] }}
        onOpen={onOpen}
        onBack={() => {}}
      />
    );
    await user.click(screen.getByRole('button', { name: /ステップ1/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onOpen).toHaveBeenCalledWith(1, true);
  });

  it('keeps an already unlocked assessment available without rechecking points or units', () => {
    render(
      <AssessmentMenu
        progress={{
          ...baseProgress,
          availablePoints: 0,
          assessments: [{ step: 1, status: 'in_progress' }],
        }}
        onOpen={() => {}}
        onBack={() => {}}
      />
    );
    const step1 = screen.getByRole('button', { name: /ステップ1/ });
    expect(step1).toBeEnabled();
    expect(step1).toHaveTextContent('つづきから');
  });
});
