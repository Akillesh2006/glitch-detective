import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import * as api from './api';
import { AnalyzeResponse, ChallengeDetail } from './types';
import { clearDetectiveProgress } from './progress';

// Mock API client methods
vi.mock('./api', () => ({
  checkHealth: vi.fn(),
  analyzeCode: vi.fn(),
  fetchChallenges: vi.fn(),
  fetchNextChallenge: vi.fn(),
  fetchChallengeById: vi.fn(),
  verifyChallengeSolution: vi.fn(),
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
  real_world_analogy: 'Like opening quotation marks in a sentence but never closing them—the reader cannot tell where your quote ends.',
  actionable_summary: 'Add the matching closing delimiter to complete the expression.',
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

    // Phase 1: Real-World Analogy and Actionable Summary in Step 1
    expect(screen.getByText('Real-World Analogy')).toBeDefined();
    expect(screen.getByText(/Like opening quotation marks in a sentence/i)).toBeDefined();
    expect(screen.getByText('Action to Take')).toBeDefined();
    expect(screen.getByText(/Add the matching closing delimiter/i)).toBeDefined();

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

  it('does not display analogy callout when real_world_analogy is absent or null', async () => {
    (api.analyzeCode as any).mockResolvedValueOnce({
      ...mockDiagnosticResponse,
      real_world_analogy: null,
      actionable_summary: null,
    });

    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/Paste Python code snippet/i), {
      target: { value: 'print("Hello"' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze Code/i }));

    await waitFor(() => {
      expect(screen.getByText('Diagnose the Issue')).toBeDefined();
    });

    expect(screen.queryByText('Real-World Analogy')).toBeNull();
    expect(screen.queryByText('Action to Take')).toBeNull();
  });
});

describe('Phase 3: Detective Mode UX & Challenge Engine Integration', () => {
  const mockPythonSummary = {
    id: 'py-receipt-unclosed-paren',
    title: 'The Mystery of the Silent Receipt',
    language: 'python' as const,
    difficulty: 'beginner',
    category: 'SyntaxError: Unclosed Delimiter',
    scenario: 'A retail register discount script crashed right when printing the final bill.',
  };

  const mockPythonSummary2 = {
    id: 'py-traffic-missing-colon',
    title: 'The Mystery of the Highway Gate',
    language: 'python' as const,
    difficulty: 'beginner',
    category: 'SyntaxError: Missing Colon',
    scenario: 'An automated toll gate speed camera script stopped evaluating incoming vehicles.',
  };

  const mockPythonSummary3 = {
    id: 'py-roster-indentation',
    title: 'The Mystery of the Misplaced Student',
    language: 'python' as const,
    difficulty: 'beginner',
    category: 'IndentationError',
    scenario: 'A school gradebook export script fails to run due to misaligned loop body.',
  };

  const mockJavaSummary = {
    id: 'java-greeter-missing-semicolon',
    title: 'The Mystery of the Truncated Greeting',
    language: 'java' as const,
    difficulty: 'beginner',
    category: 'SyntaxError: Missing Semicolon',
    scenario: 'A welcome kiosk failed to display greeting.',
  };

  const mockPythonDetail = {
    id: 'py-receipt-unclosed-paren',
    title: 'The Mystery of the Silent Receipt',
    language: 'python' as const,
    difficulty: 'beginner',
    category: 'SyntaxError: Unclosed Delimiter',
    scenario: 'A retail register discount script crashed right when printing the final bill.',
    buggy_code: 'def print_receipt():\n    print("Total"',
    expected_behavior: 'The receipt prints the final price cleanly without syntax error.',
    total_hints: 2,
    unlocked_hints: [] as string[],
    hint_level: 0,
  };

  const mockPythonDetail2 = {
    id: 'py-traffic-missing-colon',
    title: 'The Mystery of the Highway Gate',
    language: 'python' as const,
    difficulty: 'beginner',
    category: 'SyntaxError: Missing Colon',
    scenario: 'An automated toll gate speed camera script stopped evaluating incoming vehicles.',
    buggy_code: 'def check_speed(speed):\n    if speed > 60\n        return "Warning"',
    expected_behavior: 'Add colon to conditional statement.',
    total_hints: 2,
    unlocked_hints: [] as string[],
    hint_level: 0,
  };

  const mockPythonDetail3 = {
    id: 'py-roster-indentation',
    title: 'The Mystery of the Misplaced Student',
    language: 'python' as const,
    difficulty: 'beginner',
    category: 'IndentationError',
    scenario: 'A school gradebook export script fails to run due to misaligned loop body.',
    buggy_code: 'for s in students:\nprint(s)',
    expected_behavior: 'Indent the loop body.',
    total_hints: 2,
    unlocked_hints: [] as string[],
    hint_level: 0,
  };

  const mockJavaDetail = {
    id: 'java-greeter-missing-semicolon',
    title: 'The Mystery of the Truncated Greeting',
    language: 'java' as const,
    difficulty: 'beginner',
    category: 'SyntaxError: Missing Semicolon',
    scenario: 'A welcome kiosk failed to display greeting.',
    buggy_code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello")\n    }\n}',
    expected_behavior: 'Greet customer with semicolon terminating statement.',
    total_hints: 2,
    unlocked_hints: [] as string[],
    hint_level: 0,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    clearDetectiveProgress();
    localStorage.clear();

    (api.checkHealth as any).mockResolvedValue({
      status: 'ok',
      app_name: 'Glitch Detective API',
      version: '0.1.0',
      tagline: 'Understand the bug. Fix the code. Learn the concept.',
      supported_languages: ['python', 'java'],
    });

    (api.fetchChallenges as any).mockImplementation(async (lang?: string) => {
      if (lang === 'java') return [mockJavaSummary];
      return [mockPythonSummary, mockPythonSummary2, mockPythonSummary3];
    });

    (api.fetchNextChallenge as any).mockImplementation(async (lang?: string, _diff?: string, seed?: number) => {
      if (lang === 'java') return mockJavaDetail;
      const pyList = [mockPythonDetail, mockPythonDetail2, mockPythonDetail3];
      const index = seed !== undefined ? seed % pyList.length : 0;
      return pyList[index];
    });

    (api.fetchChallengeById as any).mockImplementation(async (id: string, hintLevel: number) => {
      let base: ChallengeDetail = mockPythonDetail;
      if (id === 'java-greeter-missing-semicolon') base = mockJavaDetail;
      else if (id === 'py-traffic-missing-colon') base = mockPythonDetail2;
      else if (id === 'py-roster-indentation') base = mockPythonDetail3;

      const sampleHints = [
        'Examine the print statement line carefully.',
        'Count open and closing parentheses to balance the expression.',
      ];
      return {
        ...base,
        hint_level: hintLevel,
        unlocked_hints: sampleHints.slice(0, hintLevel),
      };
    });
  });

  it('keeps Code Mode as the default and renders the mode switcher', async () => {
    render(<App />);

    const codeModeBtn = screen.getByRole('tab', { name: /Code Mode/i });
    const detectiveModeBtn = screen.getByRole('tab', { name: /Detective Mode/i });

    expect(codeModeBtn).toBeDefined();
    expect(detectiveModeBtn).toBeDefined();
    expect(codeModeBtn.getAttribute('aria-selected')).toBe('true');
    expect(detectiveModeBtn.getAttribute('aria-selected')).toBe('false');

    // Code Mode panels exist by default
    expect(screen.getByText('Source Code & Parameters')).toBeDefined();
    expect(screen.queryByText('Case Briefing')).toBeNull();

    await waitFor(() => {
      expect(api.checkHealth).toHaveBeenCalled();
    });
  });

  it('switches between Code Mode and Detective Mode in both directions', async () => {
    render(<App />);

    // Switch to Detective Mode
    const detectiveModeBtn = screen.getByRole('tab', { name: /Detective Mode/i });
    fireEvent.click(detectiveModeBtn);

    await waitFor(() => {
      expect(screen.getByText('Case Briefing')).toBeDefined();
      expect(screen.getByText('The Mystery of the Silent Receipt')).toBeDefined();
    });

    expect(detectiveModeBtn.getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByText('Source Code & Parameters')).toBeNull();

    // Switch back to Code Mode
    const codeModeBtn = screen.getByRole('tab', { name: /Code Mode/i });
    fireEvent.click(codeModeBtn);

    expect(screen.getByText('Source Code & Parameters')).toBeDefined();
    expect(codeModeBtn.getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByText('Case Briefing')).toBeNull();
  });

  it('preserves Code Mode inputs and analysis state when toggling modes', async () => {
    (api.analyzeCode as any).mockResolvedValueOnce(mockDiagnosticResponse);
    render(<App />);

    // Type into Code Mode textarea
    const textarea = screen.getByPlaceholderText(/Paste Python code snippet/i);
    fireEvent.change(textarea, { target: { value: 'print("PersistMe"' } });
    fireEvent.click(screen.getByRole('button', { name: /Analyze Code/i }));

    await waitFor(() => {
      expect(screen.getByText('Diagnose the Issue')).toBeDefined();
    });

    // Toggle to Detective Mode
    fireEvent.click(screen.getByRole('tab', { name: /Detective Mode/i }));
    await waitFor(() => {
      expect(screen.getByText('Case Briefing')).toBeDefined();
    });

    // Toggle back to Code Mode
    fireEvent.click(screen.getByRole('tab', { name: /Code Mode/i }));
    expect(screen.getByDisplayValue('print("PersistMe"')).toBeDefined();
    expect(screen.getByText('Diagnose the Issue')).toBeDefined();
  });

  it('retrieves challenges and filters when switching language to Java', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /Detective Mode/i }));

    await waitFor(() => {
      expect(screen.getByText('The Mystery of the Silent Receipt')).toBeDefined();
    });

    // Switch language to Java in Detective Mode
    const javaBtn = screen.getByRole('radio', { name: /Java/i });
    fireEvent.click(javaBtn);

    await waitFor(() => {
      expect(api.fetchChallenges).toHaveBeenCalledWith('java');
      expect(screen.getByText('The Mystery of the Truncated Greeting')).toBeDefined();
    });

    // Verify Java code area prefilled
    expect(screen.getByDisplayValue(/System\.out\.println\("Hello"\)/)).toBeDefined();
  });

  it('reveals progressive hints one at a time and stops when all hints are revealed', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /Detective Mode/i }));

    await waitFor(() => {
      expect(screen.getByText('The Mystery of the Silent Receipt')).toBeDefined();
    });

    // Initial state: 0 hints unlocked
    expect(screen.getByText(/No clues unlocked yet/i)).toBeDefined();
    const hintBtn = screen.getByRole('button', { name: /Reveal Next Clue \(1 of 2\)/i });
    expect(hintBtn).toBeDefined();

    // Reveal Hint #1
    fireEvent.click(hintBtn);

    await waitFor(() => {
      expect(api.fetchChallengeById).toHaveBeenCalledWith('py-receipt-unclosed-paren', 1);
      expect(screen.getByText('Examine the print statement line carefully.')).toBeDefined();
    });

    // Button updates to request clue 2
    const secondHintBtn = screen.getByRole('button', { name: /Reveal Next Clue \(2 of 2\)/i });
    fireEvent.click(secondHintBtn);

    await waitFor(() => {
      expect(api.fetchChallengeById).toHaveBeenCalledWith('py-receipt-unclosed-paren', 2);
      expect(screen.getByText('Count open and closing parentheses to balance the expression.')).toBeDefined();
    });

    // All hints revealed - button is disabled
    const allRevealedBtn = screen.getByRole('button', { name: /All 2 Clues Revealed/i });
    expect(allRevealedBtn).toBeDefined();
    expect(allRevealedBtn.hasAttribute('disabled')).toBe(true);
  });

  it('verifies correct fix, displays success feedback, and persists solved progress', async () => {
    (api.verifyChallengeSolution as any).mockResolvedValueOnce({
      challenge_id: 'py-receipt-unclosed-paren',
      status: 'correct',
      passed: true,
      message: 'Case Resolved!',
      feedback: 'The unclosed parenthesis has been properly closed.',
      details: null,
    });

    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /Detective Mode/i }));

    await waitFor(() => {
      expect(screen.getByText('The Mystery of the Silent Receipt')).toBeDefined();
    });

    // Edit code to fix the bug
    const editor = screen.getByPlaceholderText(/Investigate and patch the bug here/i);
    fireEvent.change(editor, { target: { value: 'def print_receipt():\n    print("Total")' } });

    // Submit fix
    const submitBtn = screen.getByRole('button', { name: /Submit Fix for Verification/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.verifyChallengeSolution).toHaveBeenCalledWith(
        'py-receipt-unclosed-paren',
        'def print_receipt():\n    print("Total")'
      );
      expect(screen.getByText('Case Resolved!')).toBeDefined();
      expect(screen.getByText('The unclosed parenthesis has been properly closed.')).toBeDefined();
    });

    // Check Case Closed badge
    expect(screen.getByText('✓ Case Closed')).toBeDefined();

    // Check localStorage persistence
    const saved = JSON.parse(localStorage.getItem('glitch_detective_dossier_v1') || '[]');
    expect(saved).toContain('py-receipt-unclosed-paren');
  });

  it('handles incorrect and ambiguous verification outcomes appropriately', async () => {
    (api.verifyChallengeSolution as any).mockResolvedValueOnce({
      challenge_id: 'py-receipt-unclosed-paren',
      status: 'incorrect',
      passed: false,
      message: 'Defect Still Detected',
      feedback: 'The closing delimiter is still missing from the statement.',
      details: 'SyntaxError: unexpected EOF',
    });

    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /Detective Mode/i }));

    await waitFor(() => {
      expect(screen.getByText('The Mystery of the Silent Receipt')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Submit Fix for Verification/i }));

    await waitFor(() => {
      expect(screen.getByText('Defect Still Detected')).toBeDefined();
      expect(screen.getByText('The closing delimiter is still missing from the statement.')).toBeDefined();
      expect(screen.getByText('SyntaxError: unexpected EOF')).toBeDefined();
    });

    // Not marked solved
    expect(screen.queryByText('✓ Case Closed')).toBeNull();

    // Ambiguous verification test
    (api.verifyChallengeSolution as any).mockResolvedValueOnce({
      challenge_id: 'py-receipt-unclosed-paren',
      status: 'ambiguous',
      passed: false,
      message: 'Inconclusive Verification',
      feedback: 'Could not deterministically verify AST correction.',
      details: null,
    });

    fireEvent.click(screen.getByRole('button', { name: /Submit Fix for Verification/i }));

    await waitFor(() => {
      expect(screen.getByText('Inconclusive Verification')).toBeDefined();
      expect(screen.getByText('Could not deterministically verify AST correction.')).toBeDefined();
    });
  });

  it('navigates to next case on Next Case button click', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /Detective Mode/i }));

    await waitFor(() => {
      expect(screen.getByText('The Mystery of the Silent Receipt')).toBeDefined();
    });

    const nextBtn = screen.getByRole('button', { name: /Next Case →/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(api.fetchNextChallenge).toHaveBeenCalledWith('python', undefined, 1);
    });
  });

  it('resets editor code back to the initial buggy code on reset button click', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /Detective Mode/i }));

    await waitFor(() => {
      expect(screen.getByText('The Mystery of the Silent Receipt')).toBeDefined();
    });

    const editor = screen.getByPlaceholderText(/Investigate and patch the bug here/i);
    fireEvent.change(editor, { target: { value: '# Random changes made by learner' } });
    expect(screen.getByDisplayValue('# Random changes made by learner')).toBeDefined();

    // Click Reset to Buggy Code
    const resetBtn = screen.getByRole('button', { name: /Reset to Buggy Code/i });
    fireEvent.click(resetBtn);

    expect(screen.getByDisplayValue(/def print_receipt\(\):/)).toBeDefined();
  });

  it('displays user-friendly error alert on network failure and allows retry', async () => {
    (api.fetchChallenges as any).mockRejectedValueOnce(new Error('Network connection failed'));

    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /Detective Mode/i }));

    await waitFor(() => {
      expect(screen.getByText('Case Retrieval Error:')).toBeDefined();
      expect(screen.getByText(/Network connection failed/i)).toBeDefined();
    });

    // Click Retry
    (api.fetchChallenges as any).mockResolvedValueOnce([mockPythonSummary]);
    (api.fetchNextChallenge as any).mockResolvedValueOnce(mockPythonDetail);

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('The Mystery of the Silent Receipt')).toBeDefined();
    });
  });

  it('never exposes canonical solutions in the DOM', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /Detective Mode/i }));

    await waitFor(() => {
      expect(screen.getByText('The Mystery of the Silent Receipt')).toBeDefined();
    });

    // Ensure no canonical solution text or hidden solution elements appear in the rendered document
    expect(screen.queryByText(/canonical_solutions/i)).toBeNull();
    expect(screen.queryByText(/solution_code/i)).toBeNull();
    expect(screen.queryByText(/canonical/i)).toBeNull();
  });

  it('correctly tracks and displays dossier solved count across both Python and Java cases', async () => {
    (api.verifyChallengeSolution as any)
      .mockResolvedValueOnce({
        challenge_id: 'py-receipt-unclosed-paren',
        status: 'correct',
        passed: true,
        message: 'Case Resolved!',
        feedback: 'Parenthesis balanced.',
      })
      .mockResolvedValueOnce({
        challenge_id: 'java-greeter-missing-semicolon',
        status: 'correct',
        passed: true,
        message: 'Case Resolved!',
        feedback: 'Semicolon added.',
      });

    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /Detective Mode/i }));

    await waitFor(() => {
      expect(screen.getByText('The Mystery of the Silent Receipt')).toBeDefined();
    });

    // Initial state: 0 of 8 Solved
    expect(screen.getByText(/0 of 8 Solved/i)).toBeDefined();

    // Submit correct Python fix
    fireEvent.click(screen.getByRole('button', { name: /Submit Fix for Verification/i }));
    await waitFor(() => {
      expect(screen.getByText(/1 of 8 Solved/i)).toBeDefined();
    });

    // Switch to Java and submit correct Java fix
    fireEvent.click(screen.getByRole('radio', { name: /Java/i }));
    await waitFor(() => {
      expect(screen.getByText('The Mystery of the Truncated Greeting')).toBeDefined();
    });
    // Count remains 1 of 8 Solved while viewing Java before submitting
    expect(screen.getByText(/1 of 8 Solved/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Submit Fix for Verification/i }));
    await waitFor(() => {
      expect(screen.getByText(/2 of 8 Solved/i)).toBeDefined();
    });

    // Verify localStorage has both IDs
    const saved = JSON.parse(localStorage.getItem('glitch_detective_dossier_v1') || '[]');
    expect(saved).toEqual(['py-receipt-unclosed-paren', 'java-greeter-missing-semicolon']);
  });

  it('synchronizes manual case dropdown selection with subsequent Next Case navigation', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /Detective Mode/i }));

    await waitFor(() => {
      expect(screen.getByText('The Mystery of the Silent Receipt')).toBeDefined();
    });

    // Manually select second Python mystery ('py-traffic-missing-colon') from dropdown
    const selector = screen.getByLabelText(/Select Active Mystery Case/i);
    fireEvent.change(selector, { target: { value: 'py-traffic-missing-colon' } });

    await waitFor(() => {
      expect(screen.getByText('The Mystery of the Highway Gate')).toBeDefined();
    });

    // Press Next Case - should advance to third mystery ('py-roster-indentation', seed index 2)
    const nextBtn = screen.getByRole('button', { name: /Next Case →/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(api.fetchNextChallenge).toHaveBeenCalledWith('python', undefined, 2);
      expect(screen.getByText('The Mystery of the Misplaced Student')).toBeDefined();
    });
  });

  it('wraps around to the first challenge when Next Case is pressed on the last challenge', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /Detective Mode/i }));

    await waitFor(() => {
      expect(screen.getByText('The Mystery of the Silent Receipt')).toBeDefined();
    });

    // Jump to the last Python challenge ('py-roster-indentation', index 2)
    const selector = screen.getByLabelText(/Select Active Mystery Case/i);
    fireEvent.change(selector, { target: { value: 'py-roster-indentation' } });

    await waitFor(() => {
      expect(screen.getByText('The Mystery of the Misplaced Student')).toBeDefined();
    });

    // Press Next Case - should wrap around to index 0
    const nextBtn = screen.getByRole('button', { name: /Next Case →/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(api.fetchNextChallenge).toHaveBeenCalledWith('python', undefined, 0);
      expect(screen.getByText('The Mystery of the Silent Receipt')).toBeDefined();
    });
  });
});

