import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { answerAssessment, startAssessment } = vi.hoisted(() => ({ answerAssessment: vi.fn(), startAssessment: vi.fn() }));
vi.mock('../../src/lib/api/progress.js', () => ({ answerAssessment, startAssessment }));
vi.mock('../../src/components/PlayContainer.jsx', () => ({
  default: ({ initialQuestions, mode, letterCase, onFinished }) => <div>
    <span data-testid="contract">{mode}:{letterCase}:{initialQuestions.map((q) => q.r).join(',')}</span>
    <button onClick={() => onFinished([])}>finish-correct</button>
    <button onClick={() => onFinished([initialQuestions[0]])}>finish-wrong</button>
  </div>,
}));
import AssessmentRun from '../../src/components/AssessmentRun.jsx';

const initialState = { attemptVersion: 'v1', eligibleCharacterIds: ['a', 'i'], passed: false };

describe('AssessmentRun', () => {
  it('uses server eligible IDs with h2r fixed and preserves letter case', () => {
    render(<AssessmentRun studentId="s1" step={1} initialState={initialState} letterCase="lower" points={0} />);
    expect(screen.getByTestId('contract')).toHaveTextContent('h2r:lower:a,i');
  });

  it('sends prompt and selected IDs without a correctness boolean', async () => {
    answerAssessment
      .mockResolvedValueOnce(initialState)
      .mockResolvedValueOnce({ ...initialState, eligibleCharacterIds: [], passed: true });
    render(<AssessmentRun studentId="s1" step={1} initialState={initialState} letterCase="upper" points={0} />);
    fireEvent.click(screen.getByText('finish-correct'));
    await waitFor(() => expect(answerAssessment).toHaveBeenCalledTimes(2));
    expect(answerAssessment.mock.calls[0][2]).toEqual({ attemptVersion: 'v1', promptCharacterId: 'a', selectedChoiceId: 'a' });
    expect(answerAssessment.mock.calls[0][2]).not.toHaveProperty('correct');
    expect(await screen.findByText('ごうかく！')).toBeInTheDocument();
  });

  it('allows retry after a partial-save communication failure', async () => {
    answerAssessment.mockReset();
    answerAssessment.mockResolvedValueOnce(initialState).mockRejectedValueOnce(new Error('offline'));
    startAssessment.mockResolvedValue({ ...initialState, eligibleCharacterIds: ['i'] });
    render(<AssessmentRun studentId="s1" step={1} initialState={initialState} letterCase="upper" points={0} />);
    fireEvent.click(screen.getByText('finish-correct'));
    expect(await screen.findByText('offline')).toBeInTheDocument();
    fireEvent.click(screen.getByText('もういちど ためす'));
    expect(await screen.findByTestId('contract')).toHaveTextContent('h2r:upper:i');
  });
});
