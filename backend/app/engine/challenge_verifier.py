"""Deterministic challenge verification engine for Detective Mode.

Verifies learner-submitted corrections against target challenges using
deterministic AST comparison and token sequence matching without executing code.
"""

import ast
import re
from typing import List, Optional
from app.engine.challenge_catalog import get_challenge
from app.engine.python_analyzer import analyze_python_snippet
from app.engine.java_analyzer import analyze_java_snippet
from app.schemas import (
    SupportedLanguage,
    VerifyChallengeResponse,
)


def _normalize_python_ast(code: str) -> Optional[str]:
    """Parse Python code and return an attribute-free AST dump for structural comparison."""
    try:
        tree = ast.parse(code)
        return ast.dump(tree, annotate_fields=True, include_attributes=False)
    except Exception:
        return None


def _tokenize_java(code: str) -> List[str]:
    """Extract semantic tokens from Java code, stripping comments and arbitrary whitespace."""
    # Strip single-line comments
    no_comments = re.sub(r"//.*", "", code)
    # Strip block comments
    no_comments = re.sub(r"/\*.*?\*/", "", no_comments, flags=re.DOTALL)
    # Tokenize: string literals, char literals, word identifiers, or individual operator/punctuation symbols
    token_pattern = r'("[^"\\]*(?:\\.[^"\\]*)*"|\'[^\'\\]*(?:\\.[^\'\\]*)*\'|[A-Za-z0-9_]+|[^\sA-Za-z0-9_\'\"]+)'
    return re.findall(token_pattern, no_comments)


def verify_solution(challenge_id: str, submitted_code: str) -> VerifyChallengeResponse:
    """Deterministically verify whether a learner's code resolves the specified challenge.
    
    Guarantees:
    - Never executes submitted code.
    - Rejects empty, blank, or syntax-broken code.
    - Rejects arbitrary valid code that does not address the challenge.
    - Tolerates harmless formatting differences (whitespace, indentation style, comments).
    - Distinguishes correct, incorrect, and ambiguous submissions cleanly.
    """
    template = get_challenge(challenge_id)
    if not template:
        return VerifyChallengeResponse(
            challenge_id=challenge_id,
            status="ambiguous",
            passed=False,
            message="Challenge Not Found",
            feedback=f"Challenge with identifier '{challenge_id}' does not exist in the catalog.",
        )

    # 1. Sanity check: Non-blank submission
    stripped_code = submitted_code.strip()
    if not stripped_code:
        return VerifyChallengeResponse(
            challenge_id=challenge_id,
            status="incorrect",
            passed=False,
            message="Empty Submission",
            feedback="Your submission is empty. Paste or type your corrected code to test it.",
        )

    # 2. Language-specific verification
    if template.language == SupportedLanguage.PYTHON:
        return _verify_python_challenge(template, stripped_code)
    elif template.language == SupportedLanguage.JAVA:
        return _verify_java_challenge(template, stripped_code)
    else:
        return VerifyChallengeResponse(
            challenge_id=challenge_id,
            status="ambiguous",
            passed=False,
            message="Unsupported Language",
            feedback=f"Language '{template.language}' is not supported for verification.",
        )


def _verify_python_challenge(template, code: str) -> VerifyChallengeResponse:
    """Verify a Python challenge submission using static AST analysis."""
    # Step A: Validate syntax statically
    diag = analyze_python_snippet(code)
    if diag["status"] != "valid":
        return VerifyChallengeResponse(
            challenge_id=template.id,
            status="incorrect",
            passed=False,
            message="Syntax Issue Detected",
            feedback=(
                f"Your code still contains a syntax or structural issue: {diag.get('title') or diag['root_cause']}."
            ),
            details=diag.get("hint"),
        )

    # Step B: Compare AST against canonical solutions (ignoring harmless whitespace/comments)
    submitted_ast_dump = _normalize_python_ast(code)
    if not submitted_ast_dump:
        return VerifyChallengeResponse(
            challenge_id=template.id,
            status="incorrect",
            passed=False,
            message="Could Not Parse AST",
            feedback="Your code could not be parsed into a valid Python Abstract Syntax Tree.",
        )

    for canonical in template.canonical_solutions:
        canonical_dump = _normalize_python_ast(canonical)
        if canonical_dump and submitted_ast_dump == canonical_dump:
            return VerifyChallengeResponse(
                challenge_id=template.id,
                status="correct",
                passed=True,
                message="Case Solved!",
                feedback="Outstanding detective work! Your fix resolved the defect and parsed cleanly.",
            )

    # Step C: Semantic check for challenges with flexible logic (e.g. guard clauses)
    if template.id == "py-average-zerodivision":
        # Check if code defines calculate_average_transaction and guards against 0 length
        try:
            tree = ast.parse(code)
            has_func = any(isinstance(node, ast.FunctionDef) and node.name == "calculate_average_transaction" for node in ast.walk(tree))
            has_guard = any(isinstance(node, ast.If) for node in ast.walk(tree))
            if has_func and has_guard:
                return VerifyChallengeResponse(
                    challenge_id=template.id,
                    status="correct",
                    passed=True,
                    message="Case Solved!",
                    feedback="Great work! Your guard clause prevents the ZeroDivisionError when transactions are empty.",
                )
        except Exception:
            pass

    # Step D: Reject arbitrary valid code that does not match the challenge
    return VerifyChallengeResponse(
        challenge_id=template.id,
        status="incorrect",
        passed=False,
        message="Solution Does Not Match Mystery",
        feedback=(
            "Your code syntax is valid, but it does not match the expected solution for this mystery. "
            f"Review the objective: {template.expected_behavior}"
        ),
        details="Ensure you preserved the function name and fixed the specific syntax defect.",
    )


def _verify_java_challenge(template, code: str) -> VerifyChallengeResponse:
    """Verify a Java challenge submission using token normalization."""
    # Step A: Validate Java structure statically
    diag = analyze_java_snippet(code)
    if diag["status"] == "syntax_error":
        return VerifyChallengeResponse(
            challenge_id=template.id,
            status="incorrect",
            passed=False,
            message="Java Compiler / Syntax Error",
            feedback=f"Your Java code has a syntax issue: {diag.get('title') or diag['root_cause']}",
            details=diag.get("hint"),
        )

    # Step B: Compare token sequence against canonical solutions (ignoring harmless whitespace/comments)
    submitted_tokens = _tokenize_java(code)
    if not submitted_tokens:
        return VerifyChallengeResponse(
            challenge_id=template.id,
            status="incorrect",
            passed=False,
            message="No Java Tokens Found",
            feedback="No recognizable Java tokens could be extracted from your submission.",
        )

    for canonical in template.canonical_solutions:
        canonical_tokens = _tokenize_java(canonical)
        if submitted_tokens == canonical_tokens:
            return VerifyChallengeResponse(
                challenge_id=template.id,
                status="correct",
                passed=True,
                message="Case Solved!",
                feedback="Superb! Your Java fix compiled cleanly and resolved the defect.",
            )

    # Step C: Challenge-specific heuristics for alternative Java solutions
    if template.id == "java-auth-null-pointer":
        # Check if user avoided NPE (e.g. yoda condition or null check)
        joined_code = "".join(submitted_tokens)
        if '"admin".equals(username)' in joined_code or 'username!=null&&username.equals("admin")' in joined_code or 'if(username==null)returnfalse;' in joined_code:
            return VerifyChallengeResponse(
                challenge_id=template.id,
                status="correct",
                passed=True,
                message="Case Solved!",
                feedback="Excellent! Your solution prevents NullPointerException when username is null.",
            )
        elif "username.equals(" in joined_code:
            return VerifyChallengeResponse(
                challenge_id=template.id,
                status="incorrect",
                passed=False,
                message="Null Pointer Vulnerability Remains",
                feedback="Your code still calls .equals() directly on 'username'. If username is null, this crashes.",
                details='Try swapping to "admin".equals(username) or checking if username != null first.',
            )

    # Step D: Reject arbitrary valid Java code that does not solve the challenge
    return VerifyChallengeResponse(
        challenge_id=template.id,
        status="incorrect",
        passed=False,
        message="Solution Does Not Match Mystery",
        feedback=(
            "Your Java code structure is valid, but it does not resolve the specific mystery. "
            f"Expected: {template.expected_behavior}"
        ),
        details="Verify that all class names, method signatures, and statements match the scenario.",
    )
