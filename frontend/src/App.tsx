import React, { useState, useEffect } from 'react';
import {
  SupportedLanguage,
  AnalyzeResponse,
  SubmissionStatus,
  HealthResponse,
  AppMode,
  ChallengeSummary,
  ChallengeDetail,
  VerifyChallengeResponse,
} from './types';
import {
  analyzeCode,
  checkHealth,
  fetchChallenges,
  fetchNextChallenge,
  fetchChallengeById,
  verifyChallengeSolution,
} from './api';
import {
  loadSolvedChallenges,
  saveSolvedChallenge,
  clearDetectiveProgress,
} from './progress';
import './App.css';

interface SampleSnippet {
  name: string;
  lang: SupportedLanguage;
  code: string;
  error?: string;
  description: string;
}

const EXTENDED_SAMPLES: SampleSnippet[] = [
  {
    name: '🐍 Missing Parenthesis',
    lang: 'python',
    code: 'print("Hello"',
    description: 'Python syntax error: missing closing parenthesis',
  },
  {
    name: '🐍 Missing Colon',
    lang: 'python',
    code: 'if True\n    print("Condition met")',
    description: 'Python syntax error: missing colon at end of if statement',
  },
  {
    name: '🐍 ZeroDivision',
    lang: 'python',
    code: `def calculate_average(scores):\n    # Bug: Division by zero when scores list is empty\n    total = sum(scores)\n    return total / len(scores)\n\nstudents = []\nprint("Average:", calculate_average(students))`,
    error: `ZeroDivisionError: division by zero\n  File "main.py", line 4, in calculate_average\n    return total / len(scores)`,
    description: 'Python runtime division by zero',
  },
  {
    name: '☕ Missing Semicolon',
    lang: 'java',
    code: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!")\n    }\n}`,
    description: 'Java syntax error: missing statement semicolon',
  },
  {
    name: '☕ NullPointer',
    lang: 'java',
    code: `public class StringProcessor {\n    public static void main(String[] args) {\n        // Bug: Calling method on null reference\n        String username = null;\n        if (username.equals("admin")) {\n            System.out.println("Access granted");\n        }\n    }\n}`,
    error: `Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.equals(Object)" because "username" is null\n\tat StringProcessor.main(StringProcessor.java:5)`,
    description: 'Java NullPointerException',
  },
  {
    name: '☕ Ambiguous Case',
    lang: 'java',
    code: `public class ComplexService {\n    // Complex business logic without compiler\n    public void execute() {\n        doSomethingUndefined();\n    }\n}`,
    description: 'Java snippet with ambiguous semantic dependencies',
  },
];

const TOTAL_DOSSIER_CHALLENGES = 8;

export const App: React.FC = () => {
  const [language, setLanguage] = useState<SupportedLanguage>('python');
  const [code, setCode] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showErrorInput, setShowErrorInput] = useState<boolean>(true);

  // Submission & API state
  const [status, setStatus] = useState<SubmissionStatus>('idle');
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Guided workflow step state: 1 = Diagnose, 2 = Hint, 3 = Minimal Fix, 4 = Verify & Learn
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [copiedFix, setCopiedFix] = useState<boolean>(false);
  const [appliedFix, setAppliedFix] = useState<boolean>(false);

  // Step 4 verification & interactive attempt state
  const [attemptCode, setAttemptCode] = useState<string>('');
  const [attemptStatus, setAttemptStatus] = useState<'idle' | 'verifying' | 'success' | 'has_error'>('idle');
  const [attemptFeedback, setAttemptFeedback] = useState<string | null>(null);

  // Health check state
  const [healthStatus, setHealthStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);

  // Perform initial health check on mount
  useEffect(() => {
    let isMounted = true;
    const runHealthCheck = async () => {
      try {
        const data = await checkHealth();
        if (isMounted) {
          setHealthStatus('online');
          setHealthData(data);
        }
      } catch {
        if (isMounted) {
          setHealthStatus('offline');
        }
      }
    };

    runHealthCheck();
    const interval = setInterval(runHealthCheck, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Mode selection state (default 'code')
  const [appMode, setAppMode] = useState<AppMode>('code');

  // Detective Mode state
  const [detectiveLang, setDetectiveLang] = useState<SupportedLanguage>('python');
  const [challengesCatalog, setChallengesCatalog] = useState<ChallengeSummary[]>([]);
  const [currentChallenge, setCurrentChallenge] = useState<ChallengeDetail | null>(null);
  const [detectiveCode, setDetectiveCode] = useState<string>('');
  const [detectiveLoading, setDetectiveLoading] = useState<boolean>(false);
  const [detectiveError, setDetectiveError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isFetchingHint, setIsFetchingHint] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<VerifyChallengeResponse | null>(null);
  const [solvedChallenges, setSolvedChallenges] = useState<string[]>(() => loadSolvedChallenges());
  const [challengeSeed, setChallengeSeed] = useState<number>(0);
  const detectiveReqIdRef = React.useRef<number>(0);

  // Load challenge detail by ID or next seed
  const loadChallengesForLanguage = async (
    lang: SupportedLanguage,
    targetId?: string,
    seedIndex: number = 0
  ) => {
    const reqId = ++detectiveReqIdRef.current;
    setDetectiveLoading(true);
    setDetectiveError(null);
    setVerificationResult(null);

    try {
      const summaries = await fetchChallenges(lang);
      if (reqId !== detectiveReqIdRef.current) return;
      setChallengesCatalog(summaries);

      let detail: ChallengeDetail;
      let effectiveSeed = seedIndex;

      if (targetId) {
        detail = await fetchChallengeById(targetId, 0);
        const foundIndex = summaries.findIndex((c) => c.id === targetId);
        if (foundIndex >= 0) {
          effectiveSeed = foundIndex;
        }
      } else {
        detail = await fetchNextChallenge(lang, undefined, seedIndex);
        const foundIndex = summaries.findIndex((c) => c.id === detail.id);
        if (foundIndex >= 0) {
          effectiveSeed = foundIndex;
        }
      }

      if (reqId !== detectiveReqIdRef.current) return;
      setCurrentChallenge(detail);
      setDetectiveCode(detail.buggy_code);
      setChallengeSeed(effectiveSeed);
      setDetectiveLoading(false);
    } catch (err: unknown) {
      if (reqId !== detectiveReqIdRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to retrieve challenge from server.';
      setDetectiveError(msg);
      setDetectiveLoading(false);
    }
  };

  // Switch Detective Language
  const handleDetectiveLanguageChange = (newLang: SupportedLanguage) => {
    setDetectiveLang(newLang);
    loadChallengesForLanguage(newLang, undefined, 0);
  };

  // Select a specific challenge from Dossier
  const handleSelectChallenge = (id: string) => {
    if (!id || id === currentChallenge?.id || detectiveLoading) return;
    const foundIndex = challengesCatalog.findIndex((c) => c.id === id);
    const targetSeed = foundIndex >= 0 ? foundIndex : challengeSeed;
    loadChallengesForLanguage(detectiveLang, id, targetSeed);
  };

  // Advance to Next Case
  const handleNextChallenge = () => {
    if (detectiveLoading || isVerifying) return;
    const catalogLength = challengesCatalog.length;
    const nextSeed = catalogLength > 0 ? (challengeSeed + 1) % catalogLength : challengeSeed + 1;
    loadChallengesForLanguage(detectiveLang, undefined, nextSeed);
  };

  // Reveal next progressive hint
  const handleRevealNextHint = async () => {
    if (!currentChallenge || isFetchingHint) return;
    const nextLevel = currentChallenge.hint_level + 1;
    if (nextLevel > currentChallenge.total_hints) return;

    setIsFetchingHint(true);
    try {
      const updated = await fetchChallengeById(currentChallenge.id, nextLevel);
      setCurrentChallenge(updated);
    } catch {
      // Keep existing state if hint fetch fails
    } finally {
      setIsFetchingHint(false);
    }
  };

  // Reset editor back to buggy code
  const handleResetDetectiveCode = () => {
    if (currentChallenge) {
      setDetectiveCode(currentChallenge.buggy_code);
      setVerificationResult(null);
    }
  };

  // Submit fix for verification
  const handleSubmitSolution = async () => {
    if (!currentChallenge || isVerifying || detectiveLoading) return;
    if (!detectiveCode.trim()) return;

    setIsVerifying(true);
    try {
      const res = await verifyChallengeSolution(currentChallenge.id, detectiveCode);
      setVerificationResult(res);
      if (res.passed) {
        const updated = saveSolvedChallenge(currentChallenge.id);
        setSolvedChallenges(updated);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Verification request failed';
      setVerificationResult({
        challenge_id: currentChallenge.id,
        status: 'ambiguous',
        passed: false,
        message: 'Verification Error',
        feedback: errorMsg,
        details: 'Unable to communicate with verification engine.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Reset progress
  const handleClearProgress = () => {
    clearDetectiveProgress();
    setSolvedChallenges([]);
  };

  // When switching to Detective Mode, auto-load if not loaded yet
  useEffect(() => {
    if (appMode === 'detective' && !currentChallenge && !detectiveLoading && !detectiveError) {
      loadChallengesForLanguage(detectiveLang, undefined, 0);
    }
  }, [appMode]);

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    if (status === 'empty_input') {
      setStatus('idle');
    }
  };

  const handleLoadSample = (sample: SampleSnippet) => {
    setLanguage(sample.lang);
    setCode(sample.code);
    setErrorMessage(sample.error || '');
    if (sample.error) {
      setShowErrorInput(true);
    }
    setStatus('idle');
    setBackendError(null);
    setCurrentStep(1);
    setAttemptFeedback(null);
    setAttemptStatus('idle');
  };

  const handleClear = () => {
    setCode('');
    setErrorMessage('');
    setStatus('idle');
    setResult(null);
    setBackendError(null);
    setCurrentStep(1);
    setCopiedFix(false);
    setAppliedFix(false);
    setAttemptCode('');
    setAttemptFeedback(null);
    setAttemptStatus('idle');
  };

  const handleCopyFix = () => {
    if (result?.suggested_fix) {
      navigator.clipboard.writeText(result.suggested_fix);
      setCopiedFix(true);
      setTimeout(() => setCopiedFix(false), 2000);
    }
  };

  const handleApplyFixToEditor = () => {
    if (result?.suggested_fix) {
      setCode(result.suggested_fix);
      setAppliedFix(true);
      setTimeout(() => setAppliedFix(false), 2500);
    }
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!code.trim()) {
      setStatus('empty_input');
      return;
    }

    setStatus('loading');
    setBackendError(null);
    setCopiedFix(false);
    setAppliedFix(false);
    setCurrentStep(1);
    setAttemptFeedback(null);
    setAttemptStatus('idle');

    try {
      const response = await analyzeCode({
        language,
        code,
        error_message: errorMessage.trim() ? errorMessage : undefined,
      });
      setResult(response);
      setAttemptCode(code); // initialize learner's Step 4 attempt with current code
      setStatus('success');
      setHealthStatus('online');
    } catch (err: unknown) {
      setStatus('connection_error');
      const message =
        err instanceof Error ? err.message : 'Unknown communication error occurred.';
      setBackendError(message);
    }
  };

  // Step 4: Verify learner's own attempted correction
  const handleVerifyAttempt = async () => {
    if (!attemptCode.trim()) return;

    setAttemptStatus('verifying');
    setAttemptFeedback(null);

    try {
      const verifyRes = await analyzeCode({
        language,
        code: attemptCode,
      });

      if (verifyRes.status === 'valid') {
        setAttemptStatus('success');
        setAttemptFeedback(
          '🎉 Outstanding! Your fix parsed cleanly with 0 syntax errors into a valid Abstract Syntax Tree!'
        );
      } else {
        setAttemptStatus('has_error');
        const lineInfo = verifyRes.line_number ? ` on line ${verifyRes.line_number}` : '';
        setAttemptFeedback(
          `⚠️ Still contains a syntax issue${lineInfo}: ${verifyRes.title || verifyRes.root_cause}. Try reviewing the clue in Step 2 or 3!`
        );
      }
    } catch (err: unknown) {
      setAttemptStatus('has_error');
      setAttemptFeedback(
        `Verification check could not be completed: ${err instanceof Error ? err.message : 'Error'}`
      );
    }
  };

  const getStatusBadgeClass = (resStatus: string) => {
    switch (resStatus) {
      case 'valid':
        return 'badge-valid';
      case 'runtime_error':
        return 'badge-runtime';
      case 'ambiguous':
      case 'unsupported':
        return 'badge-ambiguous';
      case 'syntax_error':
      default:
        return 'badge-error';
    }
  };

  // Extract concise line snippet and pointer evidence for Step 1
  const lineEvidence = result?.relevant_evidence.filter(
    (ev) => ev.startsWith('Line ') || ev.startsWith('Pointer:')
  );

  return (
    <div className="app-wrapper">
      {/* Top Navbar */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand-section">
            <div className="logo-badge" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
                <path d="M11 8v6"></path>
                <path d="M8 11h6"></path>
              </svg>
            </div>
            <div className="brand-titles">
              <h1 className="brand-title">Glitch Detective</h1>
              <p className="brand-tagline">Understand the bug. Fix the code. Learn the concept.</p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="mode-switcher-container">
            <div className="mode-segmented-control" role="tablist" aria-label="Application Mode">
              <button
                type="button"
                id="mode-switch-code"
                className={`mode-btn ${appMode === 'code' ? 'active' : ''}`}
                onClick={() => setAppMode('code')}
                role="tab"
                aria-selected={appMode === 'code'}
              >
                <span className="mode-icon">💻</span>
                <span>Code Mode</span>
              </button>
              <button
                type="button"
                id="mode-switch-detective"
                className={`mode-btn ${appMode === 'detective' ? 'active' : ''}`}
                onClick={() => setAppMode('detective')}
                role="tab"
                aria-selected={appMode === 'detective'}
              >
                <span className="mode-icon">🕵️</span>
                <span>Detective Mode</span>
                {solvedChallenges.length > 0 && (
                  <span
                    className="mode-solved-count"
                    id="mode-solved-count"
                    title={`${Math.min(solvedChallenges.length, TOTAL_DOSSIER_CHALLENGES)} of ${TOTAL_DOSSIER_CHALLENGES} cases solved`}
                  >
                    {Math.min(solvedChallenges.length, TOTAL_DOSSIER_CHALLENGES)}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="header-meta">
            <span className="milestone-badge">
              {appMode === 'code' ? 'Milestone 2.1 · Guided UX' : 'Phase 3 · Detective Mode'}
            </span>
            <div
              className="backend-status-pill"
              title={
                healthStatus === 'online'
                  ? `Backend connected: ${healthData?.version || 'v0.1.0'}`
                  : healthStatus === 'checking'
                  ? 'Checking backend status...'
                  : 'Backend unreachable. Start backend with uvicorn app.main:app'
              }
              id="backend-status-indicator"
            >
              <span className={`status-dot ${healthStatus}`}></span>
              <span>
                {healthStatus === 'online'
                  ? 'API: Connected'
                  : healthStatus === 'checking'
                  ? 'API: Checking...'
                  : 'API: Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="app-main">
        {appMode === 'code' && (
          <>
            {/* Hero Banner */}
            <section className="hero-banner">
              <div className="hero-pill">
                <span role="img" aria-label="compass">🧭</span>
                <span>Step-by-Step Guided Debugging Tutor</span>
              </div>
          <h2 className="hero-title">
            Turn Frustrating Bugs Into{' '}
            <span className="hero-highlight">Aha! Moments</span>
          </h2>
          <p className="hero-subtitle">
            Glitch Detective guides beginners one step at a time: diagnose the problem, receive a hint,
            inspect the minimal fix, and verify your learning without spoiling answers all at once.
          </p>
        </section>

        {/* Two-Column Editor / Results Layout */}
        <div className="workspace-grid">
          {/* Left Column: Code Input & Parameters */}
          <div className="panel-card" id="input-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                <h3 className="panel-title">Source Code & Parameters</h3>
              </div>

              {/* Language Selector */}
              <div className="language-selector-group">
                <span className="lang-selector-label">Language:</span>
                <div className="segmented-control" role="radiogroup" aria-label="Select Programming Language">
                  <button
                    type="button"
                    id="select-python"
                    className={`segment-btn ${language === 'python' ? 'active' : ''}`}
                    onClick={() => handleLanguageChange('python')}
                    aria-checked={language === 'python'}
                    role="radio"
                  >
                    <span className="lang-icon">🐍</span>
                    <span>Python</span>
                  </button>
                  <button
                    type="button"
                    id="select-java"
                    className={`segment-btn ${language === 'java' ? 'active' : ''}`}
                    onClick={() => handleLanguageChange('java')}
                    aria-checked={language === 'java'}
                    role="radio"
                  >
                    <span className="lang-icon">☕</span>
                    <span>Java</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Sample Buttons */}
            <div className="sample-bar">
              <span className="sample-bar-label">Try an example bug:</span>
              <div className="sample-chips-row">
                <button
                  type="button"
                  id="load-python-sample"
                  className="sample-chip"
                  onClick={() => handleLoadSample(EXTENDED_SAMPLES[2])}
                >
                  🐍 Python ZeroDivision
                </button>
                <button
                  type="button"
                  id="load-java-sample"
                  className="sample-chip"
                  onClick={() => handleLoadSample(EXTENDED_SAMPLES[4])}
                >
                  ☕ Java NullPointerException
                </button>
                <button
                  type="button"
                  id="load-python-unclosed"
                  className="sample-chip"
                  onClick={() => handleLoadSample(EXTENDED_SAMPLES[0])}
                >
                  🐍 Missing ')'
                </button>
                <button
                  type="button"
                  id="load-python-colon"
                  className="sample-chip"
                  onClick={() => handleLoadSample(EXTENDED_SAMPLES[1])}
                >
                  🐍 Missing Colon
                </button>
                <button
                  type="button"
                  id="load-java-semicolon"
                  className="sample-chip"
                  onClick={() => handleLoadSample(EXTENDED_SAMPLES[3])}
                >
                  ☕ Missing Semicolon
                </button>
                <button
                  type="button"
                  id="load-java-ambiguous"
                  className="sample-chip"
                  onClick={() => handleLoadSample(EXTENDED_SAMPLES[5])}
                >
                  ☕ Ambiguous Case
                </button>
              </div>
            </div>

            {/* Code Input Field */}
            <div className="editor-wrapper">
              <div className="editor-bar">
                <span className="editor-tag">{language}</span>
                <span>
                  {code.split('\n').length} lines · {code.length} chars (max 20,000)
                </span>
              </div>
              <textarea
                id="code-input"
                className="code-textarea"
                placeholder={
                  language === 'python'
                    ? '# Paste Python code snippet with bug here...\nprint("Hello"'
                    : '// Paste Java code snippet with bug here...\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!")\n    }\n}'
                }
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (status === 'empty_input' && e.target.value.trim()) {
                    setStatus('idle');
                  }
                }}
                spellCheck={false}
                rows={10}
              />
            </div>

            {/* Optional Error Message Section */}
            <div className="error-input-section">
              <div className="error-input-header">
                <label htmlFor="error-input" className="error-label">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>Compiler / Runtime Error Message</span>
                  <span className="optional-tag">Optional</span>
                </label>
                <button
                  type="button"
                  id="toggle-error-input"
                  className="btn-secondary"
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => setShowErrorInput(!showErrorInput)}
                >
                  {showErrorInput ? 'Hide' : 'Show'}
                </button>
              </div>

              {showErrorInput && (
                <textarea
                  id="error-input"
                  className="error-textarea"
                  placeholder="Paste traceback, compiler error, or terminal message (e.g. ZeroDivisionError, NullPointerException)..."
                  value={errorMessage}
                  onChange={(e) => setErrorMessage(e.target.value)}
                  spellCheck={false}
                  rows={3}
                />
              )}
            </div>

            {/* Validation Alerts */}
            {status === 'empty_input' && (
              <div className="alert-box alert-warning" id="empty-input-alert">
                <span className="alert-icon">⚠️</span>
                <div>
                  <strong>Code input cannot be empty:</strong> Please paste or type your {language.toUpperCase()} code
                  snippet above, or click one of the example bugs to get started.
                </div>
              </div>
            )}

            {status === 'connection_error' && (
              <div className="alert-box alert-error" id="connection-error-alert">
                <span className="alert-icon">⚡</span>
                <div>
                  <strong>Backend Connection Error:</strong> {backendError}
                  <p style={{ marginTop: '0.25rem', fontSize: '0.8rem', opacity: 0.9 }}>
                    Make sure the FastAPI backend is running via PowerShell:
                    <code> uvicorn app.main:app --reload --port 8000</code> inside the <code>backend/</code> folder.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="action-row">
              <button
                type="button"
                id="clear-button"
                className="btn-secondary"
                onClick={handleClear}
                disabled={status === 'loading'}
              >
                Clear Inputs
              </button>

              <button
                type="button"
                id="analyze-button"
                className="btn-primary"
                onClick={() => handleAnalyze()}
                disabled={status === 'loading'}
              >
                {status === 'loading' ? (
                  <>
                    <span className="spinner"></span>
                    <span>Analyzing Snippet...</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    <span>Analyze Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Guided 4-Step Educational Results */}
          <div className="panel-card" id="results-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <h3 className="panel-title">Guided Debugging Tutor</h3>
              </div>

              {result && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--accent-cyan)',
                    fontWeight: 600,
                  }}
                >
                  Language: {result.language.toUpperCase()}
                </span>
              )}
            </div>

            {/* Empty State */}
            {status !== 'success' && (
              <div className="empty-state" id="empty-state-view">
                <div className="empty-state-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </div>
                <h4 className="empty-state-title">Ready for Guided Diagnosis</h4>
                <p className="empty-state-desc">
                  Select your programming language, paste your code on the left, and click <strong>Analyze Code</strong>.
                  Glitch Detective will walk you through a 4-step guided learning path without spoiling answers immediately.
                </p>
              </div>
            )}

            {/* Success State: Show Guided 4-Step Workflow */}
            {status === 'success' && result && (
              <div className="results-panel" id="diagnosis-results">
                {/* 4-Step Progress Indicator */}
                <nav className="guided-stepper" aria-label="Guided Debugging Steps" id="guided-stepper-nav">
                  <button
                    type="button"
                    className={`step-tab ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}
                    onClick={() => setCurrentStep(1)}
                    id="step-tab-1"
                    aria-current={currentStep === 1 ? 'step' : undefined}
                  >
                    <span className="step-num">1</span>
                    <span className="step-title">Diagnose</span>
                  </button>

                  <button
                    type="button"
                    className={`step-tab ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}
                    onClick={() => setCurrentStep(2)}
                    id="step-tab-2"
                    aria-current={currentStep === 2 ? 'step' : undefined}
                  >
                    <span className="step-num">2</span>
                    <span className="step-title">Hint</span>
                  </button>

                  <button
                    type="button"
                    className={`step-tab ${currentStep === 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}
                    onClick={() => setCurrentStep(3)}
                    id="step-tab-3"
                    aria-current={currentStep === 3 ? 'step' : undefined}
                  >
                    <span className="step-num">3</span>
                    <span className="step-title">Fix</span>
                  </button>

                  <button
                    type="button"
                    className={`step-tab ${currentStep === 4 ? 'active' : ''}`}
                    onClick={() => setCurrentStep(4)}
                    id="step-tab-4"
                    aria-current={currentStep === 4 ? 'step' : undefined}
                  >
                    <span className="step-num">4</span>
                    <span className="step-title">Verify & Learn</span>
                  </button>
                </nav>

                {/* Overall Diagnostic Pill */}
                <div className="diagnostic-summary-bar" id="milestone-callout">
                  <div className="diagnostic-badge-group">
                    <span className={`status-badge ${getStatusBadgeClass(result.status)}`}>
                      {result.status === 'valid'
                        ? 'Clean Syntax'
                        : result.error_category || 'Diagnostic Detected'}
                    </span>
                    {result.line_number && (
                      <span className="meta-pill line-pill">
                        Line {result.line_number}
                      </span>
                    )}
                    <span className="meta-pill confidence-pill">
                      Confidence: {result.confidence || 'high'}
                    </span>
                  </div>
                </div>

                {/* STEP 1: DIAGNOSE (Only category, severity, line, short explanation, line evidence) */}
                {currentStep === 1 && (
                  <div className="step-content-pane" id="step-pane-1">
                    <article className="result-card card-root-cause" id="section-root-cause">
                      <div className="result-card-header">
                        <div className="step-card-heading">
                          <span className="step-indicator-tag">Step 1 of 4</span>
                          <span>Diagnose the Issue</span>
                        </div>
                        <span role="img" aria-label="bug">🎯</span>
                      </div>
                      <div className="result-card-body">
                        <div className="diagnostic-headline">
                          <span className="diagnostic-category-tag">
                            {result.error_category || 'Syntax Diagnostic'}
                          </span>
                          {result.line_number && (
                            <span className="diagnostic-line-tag">Line {result.line_number}</span>
                          )}
                          <span className="diagnostic-severity-tag">
                            {result.status === 'valid'
                              ? 'Severity: None'
                              : result.status === 'ambiguous'
                              ? 'Severity: Informational'
                              : 'Severity: High'}
                          </span>
                        </div>

                        <p className="beginner-explanation-text" id="step-1-explanation">
                          {result.title ? `${result.title}. ` : ''}
                          {result.root_cause}
                        </p>

                        {/* Real-World Analogy */}
                        {result.real_world_analogy && (
                          <div className="analogy-callout-box" id="step-1-analogy">
                            <div className="analogy-label">
                              <span role="img" aria-label="analogy">💡</span>
                              <span>Real-World Analogy</span>
                            </div>
                            <p className="analogy-text" id="step-1-analogy-text">
                              {result.real_world_analogy}
                            </p>
                          </div>
                        )}

                        {/* Actionable Correction Summary */}
                        {result.actionable_summary && (
                          <div className="actionable-summary-box" id="step-1-actionable-summary">
                            <div className="actionable-label">
                              <span role="img" aria-label="target">🎯</span>
                              <span>Action to Take</span>
                            </div>
                            <p className="actionable-text" id="step-1-actionable-text">
                              {result.actionable_summary}
                            </p>
                          </div>
                        )}

                        {/* Minimal highlighted evidence (line and pointer only) */}
                        {lineEvidence && lineEvidence.length > 0 && (
                          <div className="step-evidence-box" id="step-1-line-evidence">
                            <span className="evidence-header-label">Relevant Source Line:</span>
                            <div className="evidence-line-snippet">
                              {lineEvidence.map((ev, i) => (
                                <div key={i} className="evidence-code-text">
                                  {ev}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </article>

                    {/* Step 1 Navigation */}
                    <div className="step-navigation-bar">
                      <div className="nav-step-info">Step 1: Understand what was detected</div>
                      <button
                        type="button"
                        id="step-next-button"
                        className="btn-primary"
                        onClick={() => setCurrentStep(2)}
                      >
                        <span>Next: Give Me a Hint</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: GIVE A HINT (Contextual hint or guiding question, no full fix yet) */}
                {currentStep === 2 && (
                  <div className="step-content-pane" id="step-pane-2">
                    <article className="result-card card-hint" id="section-hint">
                      <div className="result-card-header">
                        <div className="step-card-heading">
                          <span className="step-indicator-tag">Step 2 of 4</span>
                          <span>Contextual Hint & Guiding Question</span>
                        </div>
                        <span role="img" aria-label="light-bulb">💡</span>
                      </div>
                      <div className="result-card-body">
                        <div className="hint-container">
                          <div className="hint-question-box" id="step-2-hint-text">
                            <p className="hint-text">
                              {result.hint ||
                                (result.line_number
                                  ? `Look closely at line ${result.line_number}. What syntax token is required to complete this statement?`
                                  : 'Review the structure of your code. What token or keyword is missing?')}
                            </p>
                          </div>

                          <div className="hint-reflection-callout">
                            <span role="img" aria-label="thinking">🤔</span>
                            <span>
                              <strong>Try inspecting your code:</strong> Read line{' '}
                              {result.line_number || 1} carefully. Which character or indentation change would satisfy the compiler or parser?
                            </span>
                          </div>

                          <div className="skip-hint-row">
                            <span className="skip-hint-text">Ready to see the minimal fix?</span>
                            <button
                              type="button"
                              className="btn-text-link"
                              id="skip-to-fix-btn"
                              onClick={() => setCurrentStep(3)}
                            >
                              Reveal minimal fix in Step 3 →
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>

                    {/* Step 2 Navigation */}
                    <div className="step-navigation-bar">
                      <button
                        type="button"
                        id="step-back-button"
                        className="btn-secondary"
                        onClick={() => setCurrentStep(1)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                        <span>Back: Diagnosis</span>
                      </button>

                      <button
                        type="button"
                        id="step-next-button"
                        className="btn-primary"
                        onClick={() => setCurrentStep(3)}
                      >
                        <span>Next: Suggest Minimal Fix</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: SUGGEST THE MINIMAL FIX (Smallest appropriate correction & why it works) */}
                {currentStep === 3 && (
                  <div className="step-content-pane" id="step-pane-3">
                    <article className="result-card card-fix" id="section-suggested-fix">
                      <div className="result-card-header">
                        <div className="step-card-heading">
                          <span className="step-indicator-tag">Step 3 of 4</span>
                          <span>Minimal Corrected Code & Explanation</span>
                        </div>
                        <span role="img" aria-label="wrench">🛠️</span>
                      </div>
                      <div className="result-card-body">
                        <div className="fix-toolbar">
                          <span className="fix-toolbar-label">
                            {result.confidence === 'ambiguous'
                              ? 'Manual review needed (no automated fix):'
                              : 'Smallest appropriate correction:'}
                          </span>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className="copy-fix-btn"
                              id="copy-fix-button"
                              onClick={handleCopyFix}
                              title="Copy suggested fix to clipboard"
                            >
                              {copiedFix ? '✓ Copied!' : 'Copy Fix'}
                            </button>
                            <button
                              type="button"
                              className="copy-fix-btn"
                              id="apply-fix-button"
                              onClick={handleApplyFixToEditor}
                              title="Apply this corrected code directly into the editor"
                            >
                              {appliedFix ? '✓ Applied to Editor!' : 'Apply to Editor'}
                            </button>
                          </div>
                        </div>

                        <pre className="code-block-display" id="step-3-suggested-fix-code">
                          <code>{result.suggested_fix}</code>
                        </pre>

                        {/* Why this fix works */}
                        {result.fix_explanation && (
                          <div className="fix-explanation-box" id="step-3-fix-explanation">
                            <strong className="fix-explanation-title">💡 Why this fix works:</strong>
                            <p>{result.fix_explanation}</p>
                          </div>
                        )}
                      </div>
                    </article>

                    {/* Step 3 Navigation */}
                    <div className="step-navigation-bar">
                      <button
                        type="button"
                        id="step-back-button"
                        className="btn-secondary"
                        onClick={() => setCurrentStep(2)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                        <span>Back: Hint</span>
                      </button>

                      <button
                        type="button"
                        id="step-next-button"
                        className="btn-primary"
                        onClick={() => setCurrentStep(4)}
                      >
                        <span>Next: Verify & Learn</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: VERIFY AND LEARN (Verification status, safe output, question, learner attempt) */}
                {currentStep === 4 && (
                  <div className="step-content-pane" id="step-pane-4">
                    {/* Verification Status Card */}
                    <article className="result-card card-verify" id="section-verify">
                      <div className="result-card-header">
                        <div className="step-card-heading">
                          <span className="step-indicator-tag">Step 4 of 4</span>
                          <span>Verification & Conceptual Learning</span>
                        </div>
                        <span role="img" aria-label="check">✅</span>
                      </div>
                      <div className="result-card-body">
                        {/* Static Verification Badge */}
                        <div className="verification-status-banner" id="step-4-verify-banner">
                          <div className="verification-badge">
                            <span className="verification-check-icon">✓</span>
                            <span>Static AST Validation: Parsed & Formatted Safely</span>
                          </div>
                          <p className="verification-disclaimer-note">
                            🛡️ {result.disclaimer}
                          </p>
                        </div>

                        {/* Expected Output */}
                        {result.expected_output && (
                          <div className="expected-output-box" id="step-4-expected-output">
                            <strong className="expected-output-title">
                              💻 Expected Console Output (Safe Static Inference):
                            </strong>
                            <pre className="output-code-block">
                              <code>{result.expected_output}</code>
                            </pre>
                            <span className="output-safety-tag">
                              Inferred statically from literals; no code was executed on your machine.
                            </span>
                          </div>
                        )}

                        {/* Interactive Attempt Verification Section */}
                        <div className="interactive-attempt-section" id="step-4-attempt-section">
                          <label htmlFor="attempt-code-input" className="attempt-label">
                            <span role="img" aria-label="pencil">✏️</span>
                            <span>Test Your Own Correction:</span>
                          </label>
                          <textarea
                            id="attempt-code-input"
                            className="attempt-textarea"
                            value={attemptCode}
                            onChange={(e) => setAttemptCode(e.target.value)}
                            rows={4}
                            spellCheck={false}
                            placeholder="Type your corrected version here to test if it parses..."
                          />
                          <div className="attempt-action-row">
                            <button
                              type="button"
                              id="verify-attempt-button"
                              className="btn-secondary"
                              onClick={handleVerifyAttempt}
                              disabled={attemptStatus === 'verifying'}
                            >
                              {attemptStatus === 'verifying' ? 'Verifying...' : '⚡ Verify My Correction'}
                            </button>
                            {attemptFeedback && (
                              <div
                                className={`attempt-feedback-pill ${
                                  attemptStatus === 'success' ? 'feedback-success' : 'feedback-error'
                                }`}
                                id="attempt-feedback-message"
                              >
                                {attemptFeedback}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Conceptual Practice Question */}
                        <article className="result-card card-question" id="section-practice-question" style={{ marginTop: '1rem' }}>
                          <div className="result-card-header">
                            <span>🧠 Concept Check: Reflect and Retain</span>
                          </div>
                          <div className="result-card-body">
                            <div className="question-container">
                              <p className="question-text">{result.practice_question}</p>
                              <span className="question-tip">
                                💡 Reflection: Why does this syntactic rule prevent ambiguous programs?
                              </span>
                            </div>
                          </div>
                        </article>
                      </div>
                    </article>

                    {/* Step 4 Navigation */}
                    <div className="step-navigation-bar">
                      <button
                        type="button"
                        id="step-back-button"
                        className="btn-secondary"
                        onClick={() => setCurrentStep(3)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                        <span>Back: Minimal Fix</span>
                      </button>

                      <button
                        type="button"
                        id="step-restart-button"
                        className="btn-secondary"
                        onClick={() => setCurrentStep(1)}
                      >
                        <span>↺ Review from Step 1</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Optional Technical Details Disclosure */}
                <details className="technical-details-disclosure" id="technical-details-accordion">
                  <summary className="technical-summary">
                    <span>🔬 View technical details (parser output, offsets, tokens)</span>
                  </summary>
                  <div className="technical-body">
                    <ul className="evidence-list">
                      {result.relevant_evidence.map((evidence, idx) => (
                        <li key={idx} className="evidence-item">
                          <span className="evidence-bullet">▸</span>
                          <span>{evidence}</span>
                        </li>
                      ))}
                    </ul>
                    {result.column_offset && (
                      <p className="tech-meta">
                        <strong>Column offset:</strong> {result.column_offset}
                      </p>
                    )}
                    <p className="tech-meta">
                      <strong>Host execution status:</strong> Disabled for safety.
                    </p>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </>
    )}

    {/* ========================================================================= */}
    {/* Detective Mode Workspace */}
    {/* ========================================================================= */}
    {appMode === 'detective' && (
      <>
        {/* Detective Hero Banner */}
        <section className="hero-banner detective-hero">
          <div className="hero-pill detective-pill">
            <span role="img" aria-label="detective">🕵️</span>
            <span>Detective Challenge Engine · Interactive Debugging Mysteries</span>
          </div>
          <h2 className="hero-title">
            Solve the Glitch, <span className="hero-highlight">Close the Case</span>
          </h2>
          <p className="hero-subtitle">
            Investigate realistic code defects, request progressive forensic clues, and submit your verified fix
            without spoiling the solution.
          </p>
          <div className="dossier-stats-bar">
            <span className="dossier-stat-pill" id="detective-dossier-stats">
              <strong>Case Dossier:</strong> {Math.min(solvedChallenges.length, TOTAL_DOSSIER_CHALLENGES)} of {TOTAL_DOSSIER_CHALLENGES} Solved
            </span>
            {solvedChallenges.length > 0 && (
              <button
                type="button"
                className="btn-text-link"
                id="clear-progress-btn"
                style={{ fontSize: '0.75rem', opacity: 0.7 }}
                onClick={handleClearProgress}
              >
                Reset Progress
              </button>
            )}
          </div>
        </section>

        {/* Two-Column Detective Layout */}
        <div className="workspace-grid detective-grid">
          {/* Left Column: Case Briefing & Progressive Clues */}
          <div className="panel-card" id="detective-case-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <h3 className="panel-title">Case Briefing</h3>
              </div>

              {/* Language Selector */}
              <div className="language-selector-group">
                <span className="lang-selector-label">Language:</span>
                <div className="segmented-control" role="radiogroup" aria-label="Select Detective Mode Language">
                  <button
                    type="button"
                    id="detective-select-python"
                    className={`segment-btn ${detectiveLang === 'python' ? 'active' : ''}`}
                    onClick={() => handleDetectiveLanguageChange('python')}
                    aria-checked={detectiveLang === 'python'}
                    role="radio"
                  >
                    <span className="lang-icon">🐍</span>
                    <span>Python</span>
                  </button>
                  <button
                    type="button"
                    id="detective-select-java"
                    className={`segment-btn ${detectiveLang === 'java' ? 'active' : ''}`}
                    onClick={() => handleDetectiveLanguageChange('java')}
                    aria-checked={detectiveLang === 'java'}
                    role="radio"
                  >
                    <span className="lang-icon">☕</span>
                    <span>Java</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Case Selector Dropdown */}
            {challengesCatalog.length > 0 && (
              <div className="case-selector-bar">
                <label htmlFor="detective-case-selector" className="case-selector-label">
                  <span>Active Mystery:</span>
                </label>
                <select
                  id="detective-case-selector"
                  className="case-selector-dropdown"
                  value={currentChallenge?.id || ''}
                  onChange={(e) => handleSelectChallenge(e.target.value)}
                  aria-label="Select Active Mystery Case"
                >
                  {challengesCatalog.map((c) => {
                    const isSolved = solvedChallenges.includes(c.id);
                    return (
                      <option key={c.id} value={c.id}>
                        {isSolved ? '✓ ' : ''}{c.title} ({c.difficulty})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Loading State */}
            {detectiveLoading && (
              <div className="empty-state" id="detective-loading">
                <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></div>
                <h4 className="empty-state-title" style={{ marginTop: '1rem' }}>Loading Case File...</h4>
                <p className="empty-state-desc">Retrieving mystery briefing from the Detective Challenge Engine.</p>
              </div>
            )}

            {/* Error Alert */}
            {detectiveError && !detectiveLoading && (
              <div className="alert-box alert-error" id="detective-error-alert">
                <span className="alert-icon">⚡</span>
                <div>
                  <strong>Case Retrieval Error:</strong> {detectiveError}
                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      id="detective-retry-btn"
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                      onClick={() => loadChallengesForLanguage(detectiveLang)}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Case Content */}
            {!detectiveLoading && currentChallenge && (
              <>
                <article className="result-card detective-dossier-card" id="detective-case-card">
                  <div className="result-card-header">
                    <div className="step-card-heading">
                      <span className="step-indicator-tag">Mystery Case</span>
                      <h4 className="detective-case-title-text" id="detective-case-title">
                        {currentChallenge.title}
                      </h4>
                    </div>
                    {solvedChallenges.includes(currentChallenge.id) ? (
                      <span className="badge-solved" id="detective-solved-badge">
                        ✓ Case Closed
                      </span>
                    ) : (
                      <span className="badge-open" id="detective-open-badge">
                        🔍 Open Investigation
                      </span>
                    )}
                  </div>

                  <div className="result-card-body">
                    <div className="diagnostic-headline">
                      <span className="diagnostic-category-tag" id="detective-category-badge">
                        {currentChallenge.category}
                      </span>
                      <span className="diagnostic-severity-tag" id="detective-difficulty-badge">
                        Difficulty: {currentChallenge.difficulty}
                      </span>
                    </div>

                    <div className="scenario-briefing-box">
                      <span className="scenario-briefing-label">🚨 Incident Report:</span>
                      <p className="beginner-explanation-text" id="detective-case-scenario">
                        {currentChallenge.scenario}
                      </p>
                    </div>

                    <div className="expected-behavior-box">
                      <div className="actionable-label">
                        <span role="img" aria-label="target">🎯</span>
                        <span>Expected Behavior</span>
                      </div>
                      <p className="actionable-text" id="detective-expected-behavior">
                        {currentChallenge.expected_behavior}
                      </p>
                    </div>
                  </div>
                </article>

                {/* Progressive Clues Section */}
                <article className="result-card card-hint detective-clues-card" id="detective-clues-section">
                  <div className="result-card-header">
                    <div className="step-card-heading">
                      <span className="step-indicator-tag">Forensic Clues</span>
                      <span>
                        Investigation Clues ({currentChallenge.unlocked_hints.length} of {currentChallenge.total_hints})
                      </span>
                    </div>
                    <span role="img" aria-label="magnifier">🔎</span>
                  </div>

                  <div className="result-card-body">
                    <div className="clues-action-row">
                      <button
                        type="button"
                        id="detective-hint-button"
                        className="btn-secondary hint-reveal-btn"
                        onClick={handleRevealNextHint}
                        disabled={
                          isFetchingHint ||
                          currentChallenge.unlocked_hints.length >= currentChallenge.total_hints
                        }
                      >
                        {isFetchingHint ? (
                          <>
                            <span className="spinner"></span>
                            <span>Unlocking Clue...</span>
                          </>
                        ) : currentChallenge.unlocked_hints.length >= currentChallenge.total_hints ? (
                          <>
                            <span>✓ All {currentChallenge.total_hints} Clues Revealed</span>
                          </>
                        ) : (
                          <>
                            <span>💡 Reveal Next Clue ({currentChallenge.unlocked_hints.length + 1} of {currentChallenge.total_hints})</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="clues-list-container" id="detective-hints-list">
                      {currentChallenge.unlocked_hints.length === 0 ? (
                        <div className="clue-empty-prompt">
                          <span>🕵️ No clues unlocked yet. Inspect the crime scene on the right, or request a clue if you are stuck.</span>
                        </div>
                      ) : (
                        currentChallenge.unlocked_hints.map((hint, idx) => (
                          <div
                            key={idx}
                            className="clue-item-card"
                            id={`detective-hint-item-${idx}`}
                          >
                            <div className="clue-item-header">
                              <span className="clue-number-badge">Clue #{idx + 1}</span>
                            </div>
                            <p className="clue-item-text">{hint}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </article>
              </>
            )}
          </div>

          {/* Right Column: Crime Scene Code Editor & Verification */}
          <div className="panel-card" id="detective-editor-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                <h3 className="panel-title">Crime Scene: Buggy Source Code</h3>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  id="detective-reset-code-btn"
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                  onClick={handleResetDetectiveCode}
                  title="Reset editor back to the challenge's initial buggy code"
                  disabled={detectiveLoading || !currentChallenge}
                >
                  ↺ Reset to Buggy Code
                </button>
              </div>
            </div>

            {/* Editor */}
            <div className="editor-wrapper">
              <div className="editor-bar">
                <span className="editor-tag">{detectiveLang}</span>
                <span>
                  {detectiveCode.split('\n').length} lines · {detectiveCode.length} chars
                </span>
              </div>
              <textarea
                id="detective-code-input"
                className="code-textarea"
                placeholder="# Investigate and patch the bug here..."
                value={detectiveCode}
                onChange={(e) => setDetectiveCode(e.target.value)}
                spellCheck={false}
                rows={12}
                disabled={detectiveLoading}
              />
            </div>

            {/* Submit & Next Actions */}
            <div className="action-row">
              <button
                type="button"
                id="detective-next-button"
                className="btn-secondary"
                onClick={handleNextChallenge}
                disabled={detectiveLoading || isVerifying}
              >
                <span>Next Case →</span>
              </button>

              <button
                type="button"
                id="detective-submit-button"
                className="btn-primary"
                onClick={handleSubmitSolution}
                disabled={isVerifying || detectiveLoading || !detectiveCode.trim()}
              >
                {isVerifying ? (
                  <>
                    <span className="spinner"></span>
                    <span>Verifying Fix...</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    <span>Submit Fix for Verification</span>
                  </>
                )}
              </button>
            </div>

            {/* Verification Feedback Banner */}
            {verificationResult && (
              <div
                className={`detective-feedback-banner feedback-banner-${verificationResult.status}`}
                id="detective-feedback-banner"
              >
                <div className="feedback-banner-header">
                  <span className="feedback-status-badge">
                    {verificationResult.status === 'correct'
                      ? '🎉 Case Resolved!'
                      : verificationResult.status === 'incorrect'
                      ? '⚠️ Defect Still Present'
                      : '🔍 Inconclusive Verification'}
                  </span>
                  <span className="feedback-outcome-text" id="detective-feedback-message">
                    {verificationResult.message}
                  </span>
                </div>

                <p className="feedback-pedagogical-text" id="detective-feedback-text">
                  {verificationResult.feedback}
                </p>

                {verificationResult.details && (
                  <div className="feedback-details-box" id="detective-feedback-details">
                    <strong>Detail clue:</strong> <code>{verificationResult.details}</code>
                  </div>
                )}

                {verificationResult.passed && (
                  <div className="feedback-next-prompt">
                    <span>Outstanding work detective! Case closed. Ready for the next mystery?</span>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                      onClick={handleNextChallenge}
                    >
                      Advance to Next Case →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </>
    )}
  </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          <div>
            <strong>Glitch Detective</strong> — Milestone 2.1: Step-by-Step Guided Debugging UX.
          </div>
          <div className="footer-ai-disclosure">
            Deterministic AST parser & static analysis. User code is never executed on the host system.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
