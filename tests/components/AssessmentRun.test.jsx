import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { answerAssessment, startAssessment } = vi.hoisted(() => ({ answerAssessment: vi.fn(), startAssessment: vi.fn() }));
vi.mock('../../src/lib/api/progress.js', () => ({ answerAssessment, startAssessment }));
vi.mock('../../src/components/PlayContainer.jsx', () => ({
  default: ({ initialQuestions, mode, letterCase, onFinished, onAnswer, onBack }) => <div>
    <span data-testid="contract">{mode}:{letterCase}:{initialQuestions.map((q) => q.r).join(',')}</span>
    {initialQuestions.map((q) => <span key={q.r}>
      <button onClick={() => onAnswer(q, q, true)}>correct-{q.r}</button>
      <button onClick={() => onAnswer(q, { r: 'ka', step: 'seion' }, false)}>wrong-{q.r}</button>
    </span>)}
    <button onClick={() => onFinished([])}>finish</button>
    <button onClick={onBack}>back</button>
  </div>,
}));
import AssessmentRun from '../../src/components/AssessmentRun.jsx';

const initialState = { attemptVersion: 'v1', eligibleCharacterIds: ['a', 'i'], passed: false };

describe('AssessmentRun', () => {
  beforeEach(() => {
    answerAssessment.mockReset();
    startAssessment.mockReset();
  });

  it('uses server eligible IDs with h2r fixed and preserves letter case', () => {
    render(<AssessmentRun studentId="s1" step={1} initialState={initialState} letterCase="lower" points={0} />);
    expect(screen.getByTestId('contract')).toHaveTextContent('h2r:lower:a,i');
  });

  it('saves each answer as soon as it is given, before the round ends', async () => {
    answerAssessment.mockResolvedValue({ ...initialState, eligibleCharacterIds: ['i'] });
    render(<AssessmentRun studentId="s1" step={1} initialState={initialState} letterCase="upper" points={0} />);
    fireEvent.click(screen.getByText('correct-a'));
    await waitFor(() => expect(answerAssessment).toHaveBeenCalledTimes(1));
    expect(answerAssessment.mock.calls[0]).toEqual(['s1', 1, { attemptVersion: 'v1', promptCharacterId: 'a', selectedChoiceId: 'a' }]);
    expect(answerAssessment.mock.calls[0][2]).not.toHaveProperty('correct');
    // 出題中は問題リストを作り直さない
    expect(screen.getByTestId('contract')).toHaveTextContent('h2r:upper:a,i');
  });

  it('sends the tapped card for a wrong answer', async () => {
    answerAssessment.mockResolvedValue(initialState);
    render(<AssessmentRun studentId="s1" step={1} initialState={initialState} letterCase="upper" points={0} />);
    fireEvent.click(screen.getByText('wrong-a'));
    await waitFor(() => expect(answerAssessment).toHaveBeenCalledTimes(1));
    expect(answerAssessment.mock.calls[0][2]).toEqual({ attemptVersion: 'v1', promptCharacterId: 'a', selectedChoiceId: 'ka' });
  });

  it('passes after the last saved answer reports passed', async () => {
    const onPassed = vi.fn();
    answerAssessment
      .mockResolvedValueOnce({ ...initialState, eligibleCharacterIds: ['i'] })
      .mockResolvedValueOnce({ ...initialState, eligibleCharacterIds: [], passed: true });
    render(<AssessmentRun studentId="s1" step={1} initialState={initialState} letterCase="upper" points={0} onPassed={onPassed} />);
    fireEvent.click(screen.getByText('correct-a'));
    fireEvent.click(screen.getByText('correct-i'));
    fireEvent.click(screen.getByText('finish'));
    expect(await screen.findByText('ごうかく！')).toBeInTheDocument();
    expect(answerAssessment).toHaveBeenCalledTimes(2);
    expect(answerAssessment.mock.calls.map((call) => call[2].promptCharacterId)).toEqual(['a', 'i']);
    expect(onPassed).toHaveBeenCalledOnce();
  });

  it('shows the review round returned by the server', async () => {
    answerAssessment
      .mockResolvedValueOnce({ ...initialState, eligibleCharacterIds: ['i'] })
      .mockResolvedValueOnce({ ...initialState, eligibleCharacterIds: ['a'] });
    render(<AssessmentRun studentId="s1" step={1} initialState={initialState} letterCase="upper" points={0} />);
    fireEvent.click(screen.getByText('wrong-a'));
    fireEvent.click(screen.getByText('correct-i'));
    fireEvent.click(screen.getByText('finish'));
    await waitFor(() => expect(screen.getByTestId('contract')).toHaveTextContent('h2r:upper:a'));
    expect(screen.getByTestId('contract')).not.toHaveTextContent('a,i');
  });

  it('waits for in-flight saves before going back', async () => {
    const onBack = vi.fn();
    let release;
    answerAssessment.mockReturnValueOnce(new Promise((resolve) => { release = () => resolve(initialState); }));
    render(<AssessmentRun studentId="s1" step={1} initialState={initialState} letterCase="upper" points={0} onBack={onBack} />);
    fireEvent.click(screen.getByText('correct-a'));
    fireEvent.click(screen.getByText('back'));
    await Promise.resolve();
    expect(onBack).not.toHaveBeenCalled();
    release();
    await waitFor(() => expect(onBack).toHaveBeenCalledOnce());
  });

  it('allows retry after a save failure and stops sending later answers', async () => {
    answerAssessment.mockRejectedValueOnce(new Error('offline'));
    startAssessment.mockResolvedValue({ ...initialState, eligibleCharacterIds: ['i'] });
    render(<AssessmentRun studentId="s1" step={1} initialState={initialState} letterCase="upper" points={0} />);
    fireEvent.click(screen.getByText('correct-a'));
    fireEvent.click(screen.getByText('correct-i'));
    fireEvent.click(screen.getByText('finish'));
    expect(await screen.findByText('offline')).toBeInTheDocument();
    expect(answerAssessment).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('もういちど ためす'));
    expect(await screen.findByTestId('contract')).toHaveTextContent('h2r:upper:i');
  });
});
