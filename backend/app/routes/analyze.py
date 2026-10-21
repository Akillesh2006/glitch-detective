"""Analysis route handler for Glitch Detective."""

from fastapi import APIRouter
from app.schemas import AnalyzeRequest, AnalyzeResponse, SupportedLanguage
from app.engine.python_analyzer import analyze_python_snippet
from app.engine.java_analyzer import analyze_java_snippet

router = APIRouter(tags=["analyze"])


@router.post("/analyze", response_model=AnalyzeResponse, summary="Analyze Code Snippet")
def analyze_code(payload: AnalyzeRequest) -> AnalyzeResponse:
    """Analyze a submitted code snippet and optional error message.
    
    Milestone 2 Real Debugging Engine:
    - Python: Safe AST syntax parsing with ast.parse(), delimiter & indentation detection,
      minimal fix generation, and safe static output inference.
    - Java: Deterministic static analysis for syntax, delimiters, semicolons, and NPE patterns;
      safe compiler invocation if javac is available; honest limitation for ambiguous snippets.
    - User code is NEVER executed on the host system.
    """
    try:
        if payload.language == SupportedLanguage.PYTHON or payload.language.value.lower() == "python":
            result = analyze_python_snippet(payload.code, payload.error_message)
        elif payload.language == SupportedLanguage.JAVA or payload.language.value.lower() == "java":
            result = analyze_java_snippet(payload.code, payload.error_message)
        else:
            # Fallback for unexpected language values
            return AnalyzeResponse(
                status="unsupported",
                is_placeholder=False,
                language=payload.language.value,
                root_cause=f"Language '{payload.language.value}' is not supported by Glitch Detective.",
                relevant_evidence=["Supported languages: python, java"],
                suggested_fix=payload.code,
                practice_question="Why do programming language tools require language-specific parsers?",
                disclaimer="Analysis could not be performed for unsupported language.",
                submitted_code_preview=payload.code[:100],
            )

        return AnalyzeResponse(**result)
    except Exception:
        return AnalyzeResponse(
            status="ambiguous",
            is_placeholder=False,
            language=payload.language.value,
            title="Analysis Could Not Be Completed",
            root_cause="The code snippet triggered an unexpected internal parsing condition and could not be deterministically analyzed.",
            relevant_evidence=[
                "Safe analysis: Execution prevented for safety",
                "Diagnostic withheld to prevent inaccurate feedback",
            ],
            suggested_fix=payload.code,
            fix_explanation="Review snippet syntax and structure manually.",
            expected_output="Output could not be inferred.",
            hint="Inspect the snippet for non-standard characters, unbalanced structures, or complex expressions.",
            practice_question="Why do static analyzers gracefully handle edge cases rather than crashing?",
            confidence="ambiguous",
            disclaimer="Parsed statically. Code was not executed on the host system.",
            submitted_code_preview=payload.code[:100],
            submitted_error_preview=payload.error_message[:100] if payload.error_message else None,
        )
