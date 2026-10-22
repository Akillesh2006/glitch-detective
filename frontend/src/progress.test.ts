import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadSolvedChallenges,
  saveSolvedChallenge,
  clearDetectiveProgress,
} from './progress';

describe('Progress Tracking (progress.ts)', () => {
  beforeEach(() => {
    localStorage.clear();
    clearDetectiveProgress();
  });

  it('loads empty array initially when localStorage is empty', () => {
    expect(loadSolvedChallenges()).toEqual([]);
  });

  it('saves solved challenge ID and loads it back', () => {
    const updated = saveSolvedChallenge('py-receipt');
    expect(updated).toEqual(['py-receipt']);
    expect(loadSolvedChallenges()).toEqual(['py-receipt']);
  });

  it('does not duplicate solved challenge IDs', () => {
    saveSolvedChallenge('py-receipt');
    const result = saveSolvedChallenge('py-receipt');
    expect(result).toEqual(['py-receipt']);
  });

  it('accumulates multiple unique solved challenge IDs', () => {
    saveSolvedChallenge('py-receipt');
    saveSolvedChallenge('java-semicolon');
    expect(loadSolvedChallenges()).toEqual(['py-receipt', 'java-semicolon']);
  });

  it('clears progress correctly', () => {
    saveSolvedChallenge('py-receipt');
    expect(loadSolvedChallenges()).toEqual(['py-receipt']);
    clearDetectiveProgress();
    expect(loadSolvedChallenges()).toEqual([]);
  });

  it('gracefully handles malformed JSON in localStorage', () => {
    localStorage.setItem('glitch_detective_dossier_v1', '{ broken: json [');
    expect(loadSolvedChallenges()).toEqual([]);
  });

  it('gracefully handles localStorage exception on write and preserves in-memory progress', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const res = saveSolvedChallenge('py-memory-only');
    expect(res).toContain('py-memory-only');
    expect(loadSolvedChallenges()).toContain('py-memory-only');

    setItemSpy.mockRestore();
  });
});
