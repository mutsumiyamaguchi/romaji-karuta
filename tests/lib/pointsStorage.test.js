import { describe, it, expect, beforeEach } from 'vitest';
import { getPoints, setPoints } from '../../src/lib/pointsStorage.js';

describe('pointsStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getPoints', () => {
    it('returns 0 when nothing is stored', () => {
      expect(getPoints()).toBe(0);
    });

    it('returns the stored number when present', () => {
      localStorage.setItem('romajiPoints', '120');
      expect(getPoints()).toBe(120);
    });

    it('returns 0 when stored value is not a number', () => {
      localStorage.setItem('romajiPoints', 'not-a-number');
      expect(getPoints()).toBe(0);
    });
  });

  describe('setPoints', () => {
    it('writes the value to localStorage under romajiPoints', () => {
      setPoints(50);
      expect(localStorage.getItem('romajiPoints')).toBe('50');
    });

    it('overwrites any previous value', () => {
      setPoints(10);
      setPoints(20);
      expect(localStorage.getItem('romajiPoints')).toBe('20');
    });

    it('round-trips: setPoints then getPoints returns the same value', () => {
      setPoints(310);
      expect(getPoints()).toBe(310);
    });
  });
});
