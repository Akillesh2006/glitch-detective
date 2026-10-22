/**
 * Safe browser-local progress tracking for Detective Mode.
 *
 * Stores completed mystery challenge IDs in localStorage with fallbacks
 * if localStorage is unavailable, full, or disabled.
 */

const DOSSIER_STORAGE_KEY = 'glitch_detective_dossier_v1';

let memoryFallback: string[] = [];

export function loadSolvedChallenges(): string[] {
  try {
    const raw = localStorage.getItem(DOSSIER_STORAGE_KEY);
    if (!raw) return memoryFallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const sanitized = parsed.filter((id): id is string => typeof id === 'string');
      memoryFallback = sanitized;
      return sanitized;
    }
  } catch {
    // Gracefully fallback to in-memory array if storage is inaccessible or corrupted
  }
  return memoryFallback;
}

export function saveSolvedChallenge(challengeId: string): string[] {
  try {
    const current = loadSolvedChallenges();
    if (!current.includes(challengeId)) {
      const updated = [...current, challengeId];
      memoryFallback = updated;
      localStorage.setItem(DOSSIER_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    }
    return current;
  } catch {
    if (!memoryFallback.includes(challengeId)) {
      memoryFallback = [...memoryFallback, challengeId];
    }
    return memoryFallback;
  }
}

export function clearDetectiveProgress(): void {
  try {
    memoryFallback = [];
    localStorage.removeItem(DOSSIER_STORAGE_KEY);
  } catch {
    memoryFallback = [];
  }
}
