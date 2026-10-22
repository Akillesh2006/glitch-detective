import React, { useState, useEffect } from 'react';
import {
  SupportedLanguage,
  AnalyzeResponse,
  SubmissionStatus,
  HealthResponse,
} from './types';
import { analyzeCode, checkHealth } from './api';
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

          <div className="header-meta">
            <span className="milestone-badge">Milestone 2.1 · Guided UX</span>
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
