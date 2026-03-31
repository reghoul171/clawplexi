import { describe, it, expect } from 'vitest';
import { calculatePhase, getPhaseStatus } from '../../utils/calculatePhase';

describe('calculatePhase', () => {
  describe('calculatePhase', () => {
    it('should return Planning phase for 0% progress', () => {
      const result = calculatePhase(0);
      expect(result.name).toBe('Planning');
      expect(result.index).toBe(0);
      expect(result.progress).toBe(0);
    });

    it('should return Planning phase for 5% progress', () => {
      const result = calculatePhase(5);
      expect(result.name).toBe('Planning');
    });

    it('should return Development phase for 10% progress', () => {
      const result = calculatePhase(10);
      expect(result.name).toBe('Development');
      expect(result.index).toBe(1);
    });

    it('should return Development phase for 25% progress', () => {
      const result = calculatePhase(25);
      expect(result.name).toBe('Development');
    });

    it('should return Testing phase for 50% progress', () => {
      const result = calculatePhase(50);
      expect(result.name).toBe('Testing');
      expect(result.index).toBe(2);
    });

    it('should return Review phase for 75% progress', () => {
      const result = calculatePhase(75);
      expect(result.name).toBe('Review');
      expect(result.index).toBe(3);
    });

    it('should return Deployment phase for 90% progress', () => {
      const result = calculatePhase(90);
      expect(result.name).toBe('Deployment');
      expect(result.index).toBe(4);
    });

    it('should return Complete phase for 100% progress', () => {
      const result = calculatePhase(100);
      expect(result.name).toBe('Complete');
      expect(result.index).toBe(5);
    });

    it('should clamp negative progress to 0', () => {
      const result = calculatePhase(-50);
      expect(result.progress).toBe(0);
      expect(result.name).toBe('Planning');
    });

    it('should clamp progress over 100 to 100', () => {
      const result = calculatePhase(150);
      expect(result.progress).toBe(100);
      expect(result.name).toBe('Complete');
    });

    it('should handle undefined progress', () => {
      const result = calculatePhase(undefined);
      expect(result.progress).toBe(0);
      expect(result.name).toBe('Planning');
    });

    it('should handle null progress', () => {
      const result = calculatePhase(null);
      expect(result.progress).toBe(0);
      expect(result.name).toBe('Planning');
    });

    it('should return total phases count', () => {
      const result = calculatePhase(50);
      expect(result.total).toBe(6);
    });
  });

  describe('getPhaseStatus', () => {
    it('should return completed for past phases', () => {
      const currentPhase = { index: 2, name: 'Testing' };
      expect(getPhaseStatus('Planning', currentPhase)).toBe('completed');
      expect(getPhaseStatus('Development', currentPhase)).toBe('completed');
    });

    it('should return current for active phase', () => {
      const currentPhase = { index: 2, name: 'Testing' };
      expect(getPhaseStatus('Testing', currentPhase)).toBe('current');
    });

    it('should return upcoming for future phases', () => {
      const currentPhase = { index: 2, name: 'Testing' };
      expect(getPhaseStatus('Review', currentPhase)).toBe('upcoming');
      expect(getPhaseStatus('Deployment', currentPhase)).toBe('upcoming');
      expect(getPhaseStatus('Complete', currentPhase)).toBe('upcoming');
    });
  });
});
