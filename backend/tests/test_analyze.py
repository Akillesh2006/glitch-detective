"""Tests for POST /api/analyze endpoint validation and real debugging engine diagnostics."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# 1. Python Syntax Debugging Tests
# ---------------------------------------------------------------------------

def test_python_missing_closing_parenthesis():
    """Requirement 1: print('Hello' must produce a diagnostic explaining missing ')' with fix."""
    payload = {
        "language": "python",
        "code": 'print("Hello"',
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "syntax_error"
    assert data["is_placeholder"] is False
    assert data["language"] == "python"
    assert data["line_number"] == 1
    assert data["suggested_fix"] == 'print("Hello")'
    assert data["expected_output"] == "Hello"

    # Verify diagnostic explanation
    assert "parenthesis" in data["title"].lower() or ")" in data["title"]
    assert "never closed" in data["root_cause"].lower() or "missing" in data["root_cause"].lower()
    assert data["fix_explanation"] is not None and len(data["fix_explanation"]) > 0

    # Verify the 4 mandatory learning sections
    assert "root_cause" in data and len(data["root_cause"]) > 0
    assert "relevant_evidence" in data and isinstance(data["relevant_evidence"], list)
    assert len(data["relevant_evidence"]) > 0
    assert "suggested_fix" in data and len(data["suggested_fix"]) > 0
    assert "practice_question" in data and len(data["practice_question"]) > 0

    # Verify hint for Step 2 guided workflow
    assert "hint" in data and data["hint"] is not None
    assert "parenthesis" in data["hint"].lower() or ")" in data["hint"]

    # Verify safety disclaimer confirms no execution
    assert "never executed" in data["disclaimer"].lower() or "not executed" in data["disclaimer"].lower()


def test_python_valid_syntax_no_error():
    """Requirement 2: print('Hello') reports no Python syntax error."""
    payload = {
        "language": "python",
        "code": 'print("Hello")',
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "valid"
    assert data["is_placeholder"] is False
    assert data["language"] == "python"
    assert data["line_number"] is None
    assert "no python syntax errors" in data["title"].lower() or "valid" in data["title"].lower()
    assert data["suggested_fix"] == 'print("Hello")'
    assert data["expected_output"] == "Hello"
    assert "ast.parse()" in data["relevant_evidence"][0].lower()


def test_python_missing_colon():
    """Requirement 3: if True detects the missing colon with corrected code."""
    payload = {
        "language": "python",
        "code": "if True",
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "syntax_error"
    assert data["language"] == "python"
    assert data["line_number"] == 1
    assert "colon" in data["error_category"].lower() or "colon" in data["title"].lower()
    assert "if True:" in data["suggested_fix"]
    assert "colon" in data["root_cause"].lower()
    assert "hint" in data and len(data["hint"]) > 0
    assert "line 1" in data["hint"].lower() or "punctuation" in data["hint"].lower()


def test_python_unexpected_indentation_error():
    """Requirement 4a: Detects unexpected indentation error and fixes it."""
    code = "x = 5\n  y = 10"
    payload = {
        "language": "python",
        "code": code,
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "syntax_error"
    assert data["error_category"] == "IndentationError"
    assert data["line_number"] == 2
    assert "unexpected" in data["title"].lower() or "indent" in data["title"].lower()
    assert "y = 10" in data["suggested_fix"]
    assert "  y = 10" not in data["suggested_fix"]


def test_python_missing_indented_block_error():
    """Requirement 4b: Detects expected indented block error."""
    code = "def foo():\nprint(1)"
    payload = {
        "language": "python",
        "code": code,
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "syntax_error"
    assert data["error_category"] == "IndentationError"
    assert data["line_number"] == 2
    assert "    print(1)" in data["suggested_fix"]


def test_python_correct_source_line_number_multiline():
    """Requirement 6: Diagnostic correctly reports source line number on multi-line snippets."""
    code = (
        "def compute_total(a, b):\n"
        "    result = a + b\n"
        "    items = [1, 2, (3 + 4\n"
        "    return result\n"
    )
    payload = {
        "language": "python",
        "code": code,
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "syntax_error"
    assert data["line_number"] == 3
    assert any("line 3" in ev.lower() for ev in data["relevant_evidence"])


def test_python_runtime_error_diagnostic():
    """Python snippet with valid syntax but runtime traceback provides error diagnosis."""
    payload = {
        "language": "python",
        "code": "def divide(a, b):\n    return a / b\n\nprint(divide(10, 0))",
        "error_message": "ZeroDivisionError: division by zero\n  File 'main.py', line 2, in divide",
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "runtime_error"
    assert data["is_placeholder"] is False
    assert "ZeroDivisionError" in data["error_category"]
    assert "division by zero" in data["root_cause"].lower()


# ---------------------------------------------------------------------------
# 2. Java Support and Ambiguous Cases Tests
# ---------------------------------------------------------------------------

def test_java_missing_semicolon():
    """Requirement 7a: Deterministic Java diagnostic detects missing semicolon."""
    code = (
        "public class Main {\n"
        "    public static void main(String[] args) {\n"
        "        System.out.println(\"Hello World\")\n"
        "    }\n"
        "}"
    )
    payload = {
        "language": "java",
        "code": code,
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "syntax_error"
    assert data["language"] == "java"
    assert data["line_number"] == 3
    assert "semicolon" in data["title"].lower() or "semicolon" in data["error_category"].lower()
    assert 'System.out.println("Hello World");' in data["suggested_fix"]
    assert data["expected_output"] == "Hello World"
    assert "hint" in data and len(data["hint"]) > 0
    assert "punctuation" in data["hint"].lower() or "terminate" in data["hint"].lower()


def test_java_unclosed_brace():
    """Requirement 7b: Deterministic Java diagnostic detects unclosed brace."""
    code = (
        "public class Main {\n"
        "    public static void main(String[] args) {\n"
        "        System.out.println(\"Hello\");\n"
        "    }\n"
    )
    payload = {
        "language": "java",
        "code": code,
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "syntax_error"
    assert "brace" in data["title"].lower() or "delimiter" in data["error_category"].lower()


def test_java_unsupported_or_ambiguous_case():
    """Requirement 7c: Ambiguous Java cases without compiler return honest limitation."""
    code = (
        "public class ComplexService {\n"
        "    // Ambiguous business logic without javac compiler\n"
        "    public void execute() {\n"
        "        doSomethingUndefined();\n"
        "    }\n"
        "}"
    )
    payload = {
        "language": "java",
        "code": code,
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "ambiguous"
    assert data["confidence"] == "ambiguous"
    assert "compiler" in data["root_cause"].lower()
    assert len(data["suggested_fix"]) > 0


def test_java_type_mismatch():
    """Deterministic Java diagnostic detects primitive type mismatch."""
    code = (
        "public class Main {\n"
        "    public static void main(String[] args) {\n"
        "        int count = \"10\";\n"
        "    }\n"
        "}"
    )
    payload = {
        "language": "java",
        "code": code,
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "syntax_error"
    assert "type" in data["error_category"].lower() or "incompatible" in data["title"].lower()
    assert data["line_number"] == 3


def test_java_valid_structure():
    """Valid Java class structure is recognized as valid."""
    code = (
        "public class Main {\n"
        "    public static void main(String[] args) {\n"
        "        System.out.println(\"Testing\");\n"
        "    }\n"
        "}"
    )
    payload = {
        "language": "java",
        "code": code,
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "valid"
    assert data["expected_output"] == "Testing"


# ---------------------------------------------------------------------------
# 3. Input Validation and Existing Health Behavior
# ---------------------------------------------------------------------------

def test_analyze_case_insensitive_language():
    """Requirement 8: Language field should accept casing like 'Python' or 'JAVA' gracefully."""
    payload = {
        "language": "PYTHON",
        "code": "print('hello world')",
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    assert response.json()["language"] == "python"


def test_analyze_rejects_empty_code():
    """Requirement 5: POST /api/analyze should reject empty string code with 422."""
    payload = {
        "language": "python",
        "code": "",
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 422


def test_analyze_rejects_whitespace_only_code():
    """Requirement 5: POST /api/analyze should reject whitespace-only code with 422."""
    payload = {
        "language": "python",
        "code": "   \n\t   ",
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 422


def test_analyze_rejects_unsupported_language():
    """POST /api/analyze should reject unsupported languages (e.g. ruby, cpp) with 422."""
    payload = {
        "language": "ruby",
        "code": "puts 'hello'",
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 422


def test_analyze_rejects_missing_code_field():
    """POST /api/analyze without required 'code' field should return 422."""
    payload = {
        "language": "python",
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 422


def test_analyze_rejects_missing_language_field():
    """POST /api/analyze without required 'language' field should return 422."""
    payload = {
        "code": "print('hello')",
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 422


def test_analyze_rejects_code_exceeding_max_limit():
    """POST /api/analyze should reject code snippets exceeding the max character limit."""
    oversized_code = "a = 1\n" * 4000  # > 20,000 characters
    payload = {
        "language": "python",
        "code": oversized_code,
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 422


def test_analyze_rejects_error_message_exceeding_max_limit():
    """POST /api/analyze should reject error message exceeding 10,000 characters."""
    oversized_error = "Error trace line\n" * 700  # > 10,000 characters
    payload = {
        "language": "python",
        "code": "print('test')",
        "error_message": oversized_error,
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# 4. Milestone 3: Reliability & Security Hardening Tests
# ---------------------------------------------------------------------------

def test_analyze_rejects_null_bytes_in_code():
    """Security: Code with null bytes must be rejected with 422 validation error."""
    payload = {
        "language": "python",
        "code": "print('hello\x00world')",
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 422
    assert "null bytes" in response.text.lower()


def test_analyze_rejects_null_bytes_in_error_message():
    """Security: Error message with null bytes must be rejected with 422 validation error."""
    payload = {
        "language": "python",
        "code": "print('hello')",
        "error_message": "Error on line \x001",
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 422
    assert "null bytes" in response.text.lower()


def test_python_strings_containing_delimiters_not_flagged():
    """Accuracy: Delimiters inside string literals must not trigger false unclosed delimiter errors."""
    code = 'greeting = "Hello (world) [1, 2] {key: val}"\nprint(greeting)'
    payload = {
        "language": "python",
        "code": code,
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "valid"
    assert data["error_category"] == "None (Valid Code)"


def test_python_comments_containing_delimiters_not_flagged():
    """Accuracy: Delimiters inside comments must not trigger false unclosed delimiter errors."""
    code = "# This is a comment with ( unmatched parenthesis\ndef greet():\n    return 'hi'\n\nprint(greet())"
    payload = {
        "language": "python",
        "code": code,
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "valid"


def test_python_multiline_triple_quotes_with_delimiters():
    """Accuracy: Delimiters inside multiline triple quotes must not confuse parser."""
    code = '"""\nDocstring with ( unclosed paren\nand [ bracket\n"""\nprint(10)'
    payload = {
        "language": "python",
        "code": code,
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "valid"
    assert data["expected_output"] == "10"


def test_python_runtime_variable_print_safe_disclosure():
    """Security: Prints relying on runtime variables are not executed; disclosure is returned."""
    code = "x = 10\nprint(x)"
    payload = {
        "language": "python",
        "code": code,
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "valid"
    assert "runtime variables" in data["expected_output"].lower()
    assert "not executed" in data["expected_output"].lower()


def test_python_nested_multiline_delimiter_error():
    """Accuracy: Deeply nested unclosed delimiter across lines points to the correct line."""
    code = (
        "items = [\n"
        "    (1, 2,\n"
        "    3\n"
        "]\n"
    )
    payload = {
        "language": "python",
        "code": code,
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "syntax_error"
    assert "delimiter" in data["error_category"].lower()
    assert data["line_number"] in [2, 4]


def test_python_missing_colon_with_unindented_subsequent_line():
    """Accuracy: Missing colon when next line is unindented must format the body properly."""
    code = "if True\nprint('Condition met')"
    payload = {
        "language": "python",
        "code": code,
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "syntax_error"
    assert "if True:" in data["suggested_fix"]
    assert "    print('Condition met')" in data["suggested_fix"]
    import ast
    ast.parse(data["suggested_fix"])


def test_python_does_not_invent_fix_for_ambiguous_syntax():
    """Accuracy: Complex syntax errors must not invent a fabricated fix; return honest ambiguous confidence."""
    code = "x = 1 + * 2"
    payload = {
        "language": "python",
        "code": code,
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "syntax_error"
    assert data["confidence"] == "ambiguous"
    assert "manually" in data["fix_explanation"].lower() or "guess" in data["fix_explanation"].lower()


def test_python_ignores_non_traceback_message():
    """Security & Accuracy: Non-traceback user message must NOT falsely claim a runtime error occurred."""
    code = "print('Hello world')"
    payload = {
        "language": "python",
        "code": code,
        "error_message": "I don't understand how this function works",
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "valid"
    assert any("not match" in ev.lower() or "traceback" in ev.lower() for ev in data["relevant_evidence"])


def test_python_genuine_type_error_runtime_trace():
    """Accuracy: Genuine TypeError traceback is parsed and diagnosed accurately."""
    code = "x = '10'\ny = 5\nprint(x + y)"
    payload = {
        "language": "python",
        "code": code,
        "error_message": "TypeError: can only concatenate str (not 'int') to str\n  File 'test.py', line 3, in <module>",
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "runtime_error"
    assert data["error_category"] == "TypeError"
    assert data["line_number"] == 3


def test_java_missing_semicolon_with_trailing_comment():
    """Accuracy: Java missing semicolon fix must place semicolon before inline comment."""
    code = (
        "public class Main {\n"
        "    public static void main(String[] args) {\n"
        "        int count = 42 // store the answer\n"
        "    }\n"
        "}"
    )
    payload = {
        "language": "java",
        "code": code,
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "syntax_error"
    assert "semicolon" in data["title"].lower()
    assert "int count = 42; // store the answer" in data["suggested_fix"]


def test_java_delimiter_mismatch_detected():
    """Accuracy: Java delimiter mismatch (e.g. '(' closed by '}') is explicitly reported."""
    code = (
        "public class Main {\n"
        "    public static void main(String[] args) {\n"
        "        int result = (1 + 2};\n"
        "    }\n"
        "}"
    )
    payload = {
        "language": "java",
        "code": code,
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "syntax_error"
    assert "mismatched" in data["title"].lower() or "mismatched" in data["error_category"].lower()
    assert data["line_number"] == 3
    assert "(1 + 2)" in data["suggested_fix"]


def test_java_compiler_output_path_sanitization(monkeypatch):
    """Security: Internal host filesystem paths in javac output must be sanitized."""
    from app.engine import java_analyzer

    fake_output = (
        r"C:\Users\SecretAdmin\AppData\Local\Temp\tmp_xyz123\Main.java:4: error: cannot find symbol"
        "\n  foo();\n  ^"
    )

    monkeypatch.setattr(java_analyzer, "shutil", type("MockShutil", (), {"which": staticmethod(lambda x: "/fake/javac")}))
    monkeypatch.setattr(
        java_analyzer,
        "_safe_invoke_javac",
        lambda code: (False, java_analyzer._sanitize_compiler_output(fake_output, r"C:\Users\SecretAdmin\AppData\Local\Temp\tmp_xyz123")),
    )

    payload = {
        "language": "java",
        "code": "public class Main { public static void main(String[] args) { foo(); } }",
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    response_text = str(data)
    assert "SecretAdmin" not in response_text
    assert "tmp_xyz123" not in response_text
    assert "AppData" not in response_text


def test_safe_evaluator_float_division_and_bounds():
    """Security & Accuracy: Safe evaluator supports float division and isolates uncalled functions."""
    import ast
    from app.engine.safe_evaluator import safe_infer_python_output

    code = "def uncalled_helper():\n    print('should not print')\n\nprint(10 / 2)\nprint('ok' * 3)"
    tree = ast.parse(code)
    out = safe_infer_python_output(tree)
    assert "should not print" not in out
    assert "5.0" in out
    assert "okokok" in out


def test_safe_evaluator_string_multiplication_bounds():
    """Security: Massive string multiplication ('x' * 10^9 or 10^9 * 'x') must be bounded without allocating."""
    import ast
    from app.engine.safe_evaluator import safe_infer_python_output

    code = "print('x' * 1000000000)\nprint(1000000000 * 'x')"
    tree = ast.parse(code)
    out = safe_infer_python_output(tree)
    assert "Calls print(...), but output values depend on runtime variables" in out


def test_safe_evaluator_division_by_zero():
    """Security & Accuracy: Static division by zero does not crash or raise ZeroDivisionError."""
    import ast
    from app.engine.safe_evaluator import safe_infer_python_output

    code = "print(10 / 0)\nprint(10 // 0)\nprint(10 % 0)"
    tree = ast.parse(code)
    out = safe_infer_python_output(tree)
    assert "Calls print(...), but output values depend on runtime variables" in out


def test_safe_evaluator_deeply_nested_ast_recursion_limit():
    """Security: Deeply nested binary operations do not cause uncontrolled recursion."""
    import ast
    from app.engine.safe_evaluator import safe_infer_python_output

    nested_expr = "1"
    for _ in range(40):
        nested_expr = f"({nested_expr} + 1)"
    code = f"print({nested_expr})"
    tree = ast.parse(code)
    out = safe_infer_python_output(tree)
    assert "Calls print(...), but output values depend on runtime variables" in out


def test_java_mixed_slashes_and_case_insensitive_user_sanitization(monkeypatch):
    """Security: Mixed slashes and case differences in host paths and user names are sanitized."""
    from app.engine.java_analyzer import _sanitize_compiler_output

    monkeypatch.setenv("USERNAME", "SecretUser")
    raw = "C:/Users/secretuser/AppData/Local/Temp/tmpxyz/Main.java:10: error: cannot find symbol"
    sanitized = _sanitize_compiler_output(raw)
    assert "secretuser" not in sanitized.lower() or "[redacted]" in sanitized
    assert "Main.java:10: error: cannot find symbol" in sanitized


def test_api_recovers_gracefully_from_unexpected_engine_exception(monkeypatch):
    """Reliability: Unexpected engine exceptions return structured 200 AnalyzeResponse, never 500."""
    from app.routes import analyze

    def crash_mock(code, err):
        raise RuntimeError("Unexpected internal crash test")

    monkeypatch.setattr(analyze, "analyze_python_snippet", crash_mock)

    payload = {
        "language": "python",
        "code": "print('crash')",
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ambiguous"
    assert "could not be completed" in data["title"].lower()
    assert "unexpected" in data["root_cause"].lower()
