import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkHealth,
  analyzeCode,
  fetchChallenges,
  fetchNextChallenge,
  fetchChallengeById,
  verifyChallengeSolution,
} from './api';

describe('Frontend API Client (api.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully calls checkHealth and parses response', async () => {
    const mockHealth = {
      status: 'ok',
      app_name: 'Glitch Detective API',
      version: '0.1.0',
      tagline: 'Understand the bug. Fix the code. Learn the concept.',
      supported_languages: ['python', 'java'],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockHealth,
    } as Response);

    const result = await checkHealth();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/health$/),
      expect.objectContaining({ method: 'GET' })
    );
    expect(result.status).toBe('ok');
    expect(result.app_name).toBe('Glitch Detective API');
  });

  it('throws an error when checkHealth response is not ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 503,
    } as Response);

    await expect(checkHealth()).rejects.toThrow('Health check failed with status 503');
  });

  it('successfully sends analyzeCode request and parses response', async () => {
    const mockAnalysis = {
      status: 'syntax_error',
      is_placeholder: false,
      language: 'python',
      root_cause: 'Missing closing delimiter',
      relevant_evidence: ['Line 1: print("Hello"'],
      suggested_fix: 'print("Hello")',
      practice_question: 'Why matching delimiters?',
      confidence: 'high',
      disclaimer: 'Parsed statically',
      submitted_code_preview: 'print("Hello"',
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalysis,
    } as Response);

    const result = await analyzeCode({
      language: 'python',
      code: 'print("Hello"',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/analyze$/),
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.status).toBe('syntax_error');
    expect(result.suggested_fix).toBe('print("Hello")');
  });

  it('extracts structured detail from failed analyzeCode response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        detail: [{ msg: 'The code field cannot be empty' }],
      }),
    } as Response);

    await expect(
      analyzeCode({
        language: 'python',
        code: '   ',
      })
    ).rejects.toThrow('The code field cannot be empty');
  });

  it('fetchChallenges queries /api/challenges with language and difficulty', async () => {
    const mockChallenges = [
      {
        id: 'py-test',
        title: 'Test Mystery',
        language: 'python',
        difficulty: 'beginner',
        category: 'SyntaxError',
        scenario: 'A bug occurred',
      },
    ];

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockChallenges,
    } as Response);

    const result = await fetchChallenges('python', 'beginner');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/challenges\?language=python&difficulty=beginner$/),
      expect.objectContaining({ method: 'GET' })
    );
    expect(result).toEqual(mockChallenges);
  });

  it('fetchNextChallenge queries /api/challenges/next with seed', async () => {
    const mockDetail = {
      id: 'py-receipt',
      title: 'Silent Receipt',
      language: 'python',
      difficulty: 'beginner',
      category: 'SyntaxError',
      scenario: 'Register crashed',
      buggy_code: 'print("Hello"',
      expected_behavior: 'Prints receipt',
      total_hints: 2,
      unlocked_hints: [],
      hint_level: 0,
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockDetail,
    } as Response);

    const result = await fetchNextChallenge('python', 'beginner', 3);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/challenges\/next\?language=python&difficulty=beginner&seed=3$/),
      expect.objectContaining({ method: 'GET' })
    );
    expect(result.id).toBe('py-receipt');
  });

  it('fetchChallengeById queries /api/challenges/:id with hint_level', async () => {
    const mockDetail = {
      id: 'py-receipt',
      title: 'Silent Receipt',
      language: 'python',
      difficulty: 'beginner',
      category: 'SyntaxError',
      scenario: 'Register crashed',
      buggy_code: 'print("Hello"',
      expected_behavior: 'Prints receipt',
      total_hints: 2,
      unlocked_hints: ['Look at the parenthesis'],
      hint_level: 1,
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockDetail,
    } as Response);

    const result = await fetchChallengeById('py-receipt', 1);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/challenges\/py-receipt\?hint_level=1$/),
      expect.objectContaining({ method: 'GET' })
    );
    expect(result.unlocked_hints.length).toBe(1);
  });

  it('verifyChallengeSolution posts code to /api/challenges/:id/verify', async () => {
    const mockVerifyRes = {
      challenge_id: 'py-receipt',
      status: 'correct',
      passed: true,
      message: 'Case Resolved!',
      feedback: 'Delimiters are now balanced.',
      details: null,
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockVerifyRes,
    } as Response);

    const result = await verifyChallengeSolution('py-receipt', 'print("Hello")');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/challenges\/py-receipt\/verify$/),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ code: 'print("Hello")' }),
      })
    );
    expect(result.passed).toBe(true);
    expect(result.status).toBe('correct');
  });
});
