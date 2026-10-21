import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import * as api from './api';
import { AnalyzeResponse } from './types';

// Mock health check and analyzeCode API
vi.mock('./api', () => ({
  checkHealth: vi.fn(),
  analyzeCode: vi.fn(),
}));

const mockDiagnosticResponse: AnalyzeResponse = {
  status: 'syntax_error',
  is_placeholder: false,
  language: 'python',
  error_category: 'SyntaxError: Unclosed Delimiter',
  title: "Missing Closing Parenthesis ')' on Line 1",
  line_number: 1,
  column_offset: 6,
  root_cause: "An opening parenthesis '(' starting on line 1 was never closed.",
  relevant_evidence: [
    'Parser detected SyntaxError: Unclosed Delimiter on line 1, column 6',
    'Line 1: print("Hello"',
    "Pointer:      ^ (Parser detail: '(' was never closed)",
    'Safe Analysis: Code parsed statically via ast.parse(); user code was never executed.',
  ],
  suggested_fix: 'print("Hello")',
  fix_explanation: 'Appended matching closing delimiter ) to close the expression properly.',
  expected_output: 'Hello',
  hint: "Look at the opening parenthesis after print. Which character should close it?",
  practice_question: 'Why does Python require matching delimiters?',
  confidence: 'high',
  disclaimer: 'Parsed statically using Python AST. User code was never executed.',
  submitted_code_preview: 'print("Hello"',
  submitted_error_preview: null,
};

describe('Milestone 2.1: Step-by-Step Guided Debugging UX', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api.checkHealth as any).mockResolvedValue({
      status: 'ok',
      app_name: 'Glitch Detective API',
      version: '0.1.0',
      tagline: 'Understand the bug. Fix the code. Learn the concept.',
      supported_languages: ['python', 'java'],
    });
    (api.analyzeCode as any).mockResolvedValue(mockDiagnosticResponse);
  });

  it('renders input controls and sample buttons in initial state', async () => {
    render(<App />);
    expect(screen.getByText('Source Code & Parameters')).toBeDefined();
    expect(screen.getByText('Ready for Guided Diagnosis')).toBeDefined();
    expect(screen.getByRole('button', { name: /Analyze Code/i })).toBeDefined();
    await waitFor(() => {
      expect(api.checkHealth).toHaveBeenCalled();
    });
  });

  it('starts at Step 1 (Diagnose) and hides fix, hint, and verification on initial analysis', async () => {
    render(<App />);

    // Type code into textarea
    const textarea = screen.getByPlaceholderText(/Paste Python code snippet/i);
    fireEvent.change(textarea, { target: { value: 'print("Hello"' } });

    // Click Analyze Code
    const analyzeBtn = screen.getByRole('button', { name: /Analyze Code/i });
    fireEvent.click(analyzeBtn);

    // Wait for Step 1 Diagnose to appear
    await waitFor(() => {
      expect(screen.getByText('Diagnose the Issue')).toBeDefined();
    });

    // Step 1 assertions: shows line number, category, explanation, line evidence
    expect(screen.getAllByText(/SyntaxError: Unclosed Delimiter/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Line 1/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/An opening parenthesis '\(' starting on line 1 was never closed/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Line 1: print\("Hello"/i).length).toBeGreaterThan(0);

    // Critical Requirement: Do NOT reveal corrected code or expected output in Step 1
    expect(screen.queryByText('Smallest appropriate correction:')).toBeNull();
    expect(screen.queryByText(/Expected Console Output/i)).toBeNull();
    expect(screen.queryByText(/Why this fix works/i)).toBeNull();

    // Next button points to Step 2
    expect(screen.getByRole('button', { name: /Next: Give Me a Hint/i })).toBeDefined();
  });

  it('navigates to Step 2 (Hint) with explicit user navigation and hides full fix', async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/Paste Python code snippet/i), {
      target: { value: 'print("Hello"' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze Code/i }));

    await waitFor(() => {
      expect(screen.getByText('Diagnose the Issue')).toBeDefined();
    });

    // Navigate to Step 2
    fireEvent.click(screen.getByRole('button', { name: /Next: Give Me a Hint/i }));

    // Step 2 assertions: shows hint guiding question
    expect(screen.getByText(/Contextual Hint & Guiding Question/i)).toBeDefined();
    expect(
      screen.getByText(/Look at the opening parenthesis after print\. Which character should close it\?/i)
    ).toBeDefined();

    // Full minimal fix is NOT revealed in Step 2 unless skipped
    expect(screen.queryByText('Smallest appropriate correction:')).toBeNull();
    expect(screen.queryByText(/Why this fix works/i)).toBeNull();

    // Has back navigation to Step 1 and forward navigation to Step 3
    expect(screen.getByRole('button', { name: /Back: Diagnosis/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Next: Suggest Minimal Fix/i })).toBeDefined();
  });

  it('supports back navigation from Step 2 to Step 1', async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/Paste Python code snippet/i), {
      target: { value: 'print("Hello"' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze Code/i }));

    await waitFor(() => {
      expect(screen.getByText('Diagnose the Issue')).toBeDefined();
    });

    // Advance to Step 2
    fireEvent.click(screen.getByRole('button', { name: /Next: Give Me a Hint/i }));
    expect(screen.getByText(/Contextual Hint & Guiding Question/i)).toBeDefined();

    // Go back to Step 1
    fireEvent.click(screen.getByRole('button', { name: /Back: Diagnosis/i }));
    expect(screen.getByText('Diagnose the Issue')).toBeDefined();
  });

  it('navigates to Step 3 (Suggest Minimal Fix), reveals minimal fix and explanation, and copies fix', async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/Paste Python code snippet/i), {
      target: { value: 'print("Hello"' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze Code/i }));

    await waitFor(() => {
      expect(screen.getByText('Diagnose the Issue')).toBeDefined();
    });

    // Advance to Step 2 then Step 3
    fireEvent.click(screen.getByRole('button', { name: /Next: Give Me a Hint/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next: Suggest Minimal Fix/i }));

    // Step 3 assertions: reveals minimal fix and explanation
    expect(screen.getByText('Minimal Corrected Code & Explanation')).toBeDefined();
    expect(screen.getByText('Smallest appropriate correction:')).toBeDefined();
    expect(screen.getByText(/Appended matching closing delimiter/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Copy Fix/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Apply to Editor/i })).toBeDefined();

    // Test Apply to Editor
    fireEvent.click(screen.getByRole('button', { name: /Apply to Editor/i }));
    expect(screen.getByDisplayValue('print("Hello")')).toBeDefined();
  });

  it('navigates to Step 4 (Verify & Learn), shows verification status, safe output, practice question, and handles attempt', async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/Paste Python code snippet/i), {
      target: { value: 'print("Hello"' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze Code/i }));

    await waitFor(() => {
      expect(screen.getByText('Diagnose the Issue')).toBeDefined();
    });

    // Advance through to Step 4
    fireEvent.click(screen.getByRole('button', { name: /Next: Give Me a Hint/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next: Suggest Minimal Fix/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next: Verify & Learn/i }));

    // Step 4 assertions
    expect(screen.getByText(/Verification & Conceptual Learning/i)).toBeDefined();
    expect(screen.getByText(/Static AST Validation: Parsed & Formatted Safely/i)).toBeDefined();
    expect(screen.getByText(/Expected Console Output \(Safe Static Inference\):/i)).toBeDefined();
    expect(screen.getByText(/Inferred statically from literals; no code was executed/i)).toBeDefined();
    expect(screen.getByText(/Why does Python require matching delimiters\?/i)).toBeDefined();

    // Verify learner attempt section
    expect(screen.getByText(/Test Your Own Correction:/i)).toBeDefined();
    const verifyAttemptBtn = screen.getByRole('button', { name: /Verify My Correction/i });
    expect(verifyAttemptBtn).toBeDefined();

    // Mock successful verification response for attempt
    (api.analyzeCode as any).mockResolvedValueOnce({
      ...mockDiagnosticResponse,
      status: 'valid',
      title: 'No Python Syntax Errors Detected',
      root_cause: 'Parsed cleanly into AST.',
    });

    fireEvent.click(verifyAttemptBtn);

    await waitFor(() => {
      expect(screen.getByText(/Outstanding! Your fix parsed cleanly with 0 syntax errors/i)).toBeDefined();
    });
  });

  it('supports direct tab navigation across all 4 steps', async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/Paste Python code snippet/i), {
      target: { value: 'print("Hello"' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze Code/i }));

    await waitFor(() => {
      expect(screen.getByText('Diagnose the Issue')).toBeDefined();
    });

    // Click tab 3 directly
    fireEvent.click(screen.getByRole('button', { name: /3\s*Fix/i }));
    expect(screen.getByText('Minimal Corrected Code & Explanation')).toBeDefined();

    // Click tab 2
    fireEvent.click(screen.getByRole('button', { name: /2\s*Hint/i }));
    expect(screen.getByText(/Contextual Hint & Guiding Question/i)).toBeDefined();

    // Click tab 4
    fireEvent.click(screen.getByRole('button', { name: /4\s*Verify/i }));
    expect(screen.getByText(/Verification & Conceptual Learning/i)).toBeDefined();
  });

  it('toggles technical details disclosure', async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/Paste Python code snippet/i), {
      target: { value: 'print("Hello"' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze Code/i }));

    await waitFor(() => {
      expect(screen.getByText('Diagnose the Issue')).toBeDefined();
    });

    const detailsSummary = screen.getByText(/View technical details/i);
    expect(detailsSummary).toBeDefined();
  });

  it('handles ambiguous diagnosis without misleading high-severity or automated fix claims', async () => {
    (api.analyzeCode as any).mockResolvedValueOnce({
      status: 'ambiguous',
      is_placeholder: false,
      language: 'java',
      error_category: 'JavaAnalysis: Ambiguous Snippet',
      title: 'Cannot Deterministically Diagnose Without Java Compiler',
      line_number: null,
      column_offset: null,
      root_cause: 'This snippet could not be deterministically diagnosed without a compiler.',
      relevant_evidence: ['Tutor disclosure: Diagnostic withheld to prevent inaccurate feedback'],
      suggested_fix: 'public class Solution {}',
      fix_explanation: 'Providing an explicit class definition helps verify signatures.',
      expected_output: 'Compilation required to determine output.',
      hint: 'Verify all types and declarations.',
      practice_question: 'Why does Java require explicit types?',
      confidence: 'ambiguous',
      disclaimer: 'Static analysis could not reliably diagnose without compiler. Code not executed.',
      submitted_code_preview: 'doSomethingUndefined();',
      submitted_error_preview: null,
    });

    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/Paste Python code snippet/i), {
      target: { value: 'doSomethingUndefined();' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze Code/i }));

    await waitFor(() => {
      expect(screen.getByText(/Cannot Deterministically Diagnose/i)).toBeDefined();
    });

    // Step 1: Shows Informational severity, NOT High
    expect(screen.getByText('Severity: Informational')).toBeDefined();
    expect(screen.queryByText('Severity: High')).toBeNull();

    // Navigate to Step 3
    fireEvent.click(screen.getByRole('button', { name: /3\s*Fix/i }));
    expect(screen.getByText(/Manual review needed \(no automated fix\):/i)).toBeDefined();
  });

  it('handles valid code diagnosis gracefully without error indicators', async () => {
    (api.analyzeCode as any).mockResolvedValueOnce({
      status: 'valid',
      is_placeholder: false,
      language: 'python',
      error_category: 'None (Valid Code)',
      title: 'No Python Syntax Errors Detected',
      line_number: null,
      column_offset: null,
      root_cause: 'Python AST parser detected 0 syntax or indentation errors.',
      relevant_evidence: ['ast.parse() status: Clean AST generated'],
      suggested_fix: 'print("Valid")',
      fix_explanation: 'Your code parsed cleanly with no syntax errors.',
      expected_output: 'Valid',
      hint: 'No syntax errors detected!',
      practice_question: 'What is the difference between syntax errors and logical bugs?',
      confidence: 'high',
      disclaimer: 'Parsed statically. Code not executed.',
      submitted_code_preview: 'print("Valid")',
      submitted_error_preview: null,
    });

    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/Paste Python code snippet/i), {
      target: { value: 'print("Valid")' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze Code/i }));

    await waitFor(() => {
      expect(screen.getByText(/No Python Syntax Errors Detected/i)).toBeDefined();
    });

    // Step 1: Shows Severity: None and Clean Syntax badge
    expect(screen.getByText('Severity: None')).toBeDefined();
    expect(screen.getByText('Clean Syntax')).toBeDefined();
    expect(screen.queryByText('Severity: High')).toBeNull();
  });
});
