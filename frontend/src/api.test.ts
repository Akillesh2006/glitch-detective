import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkHealth, analyzeCode } from './api';

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
});
