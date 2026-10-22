"""Tests for the deterministic explanation registry and real-world analogies."""

import pytest
from app.engine.explanations import EXPLANATION_REGISTRY, get_explanation_details
from app.engine.python_analyzer import analyze_python_snippet
from app.engine.java_analyzer import analyze_java_snippet


class TestExplanationRegistry:
    """Test suite for deterministic explanation registry."""

    def test_all_registered_categories_have_valid_explanations(self):
        """Every registered category must have non-empty analogies and actionable summaries."""
        assert len(EXPLANATION_REGISTRY) >= 20
        for category, entry in EXPLANATION_REGISTRY.items():
            assert entry.analogy is not None, f"Missing analogy for {category}"
            assert entry.actionable_summary is not None, f"Missing actionable summary for {category}"
            assert len(entry.analogy) > 10, f"Analogy too short for {category}"
            assert len(entry.analogy) < 250, f"Analogy exceeds length constraint for {category}: {entry.analogy}"
            assert len(entry.actionable_summary) > 5, f"Summary too short for {category}"
            assert len(entry.actionable_summary) < 150, f"Summary exceeds length constraint for {category}"

    @pytest.mark.parametrize(
        "category",
        [
            "SyntaxError: Unclosed Delimiter",
            "JavaSyntaxError: Unclosed Delimiter",
            "SyntaxError: Missing Colon",
            "IndentationError",
            "JavaSyntaxError: Missing Semicolon",
            "JavaStructureError: Missing Class",
            "JavaSyntaxError: Capitalization",
            "JavaLogicWarning: Reference Equality",
            "JavaTypeError: Incompatible Types",
            "NullPointerException",
            "ZeroDivisionError",
            "IndexError",
            "KeyError",
            "TypeError",
            "ValueError",
            "SyntaxError: Unterminated String",
            "SyntaxError: Invalid Assignment",
            "SyntaxError: Unmatched Delimiter",
            "JavaSyntaxError: Mismatched Delimiter",
            "SyntaxError",
            "RuntimeError",
        ],
    )
    def test_supported_categories_return_analogy_and_summary(self, category: str):
        """Supported error categories must return an analogy and actionable summary."""
        analogy, actionable = get_explanation_details(category)
        assert analogy is not None
        assert actionable is not None
        assert isinstance(analogy, str)
        assert isinstance(actionable, str)

    @pytest.mark.parametrize(
        "ambiguous_category",
        [
            "JavaAnalysis: Ambiguous Snippet",
            "ambiguous",
            "Ambiguous",
            "None (Valid Code)",
            "None (Valid Structure)",
            "unsupported",
            "UnknownFlawType",
            "completely_made_up_error",
            "",
            None,
        ],
    )
    def test_ambiguous_and_unknown_categories_never_receive_misleading_analogies(self, ambiguous_category):
        """Ambiguous, valid, or unknown categories must NEVER receive a misleading analogy."""
        analogy, actionable = get_explanation_details(ambiguous_category)
        assert analogy is None, f"Misleading analogy was returned for {ambiguous_category}: {analogy}"


class TestAnalyzerIntegration:
    """Test suite verifying analyzer integration with explanations."""

    def test_python_missing_parenthesis_has_analogy(self):
        """Python unclosed delimiter analysis returns unclosed delimiter analogy."""
        res = analyze_python_snippet('print("Hello"')
        assert res["status"] == "syntax_error"
        assert res["real_world_analogy"] is not None
        assert "quotation" in res["real_world_analogy"].lower()
        assert res["actionable_summary"] is not None
        assert "closing delimiter" in res["actionable_summary"].lower()

    def test_python_missing_colon_has_analogy(self):
        """Python missing colon returns missing colon analogy."""
        res = analyze_python_snippet("if True\n    x = 1")
        assert res["status"] == "syntax_error"
        assert res["real_world_analogy"] is not None
        assert "chapter" in res["real_world_analogy"].lower()
        assert res["actionable_summary"] is not None
        assert "colon" in res["actionable_summary"].lower()

    def test_python_indentation_error_has_analogy(self):
        """Python indentation error returns indentation analogy."""
        res = analyze_python_snippet("def foo():\nx = 1")
        assert res["status"] == "syntax_error"
        assert res["real_world_analogy"] is not None
        assert "outline" in res["real_world_analogy"].lower()
        assert res["actionable_summary"] is not None
        assert "4 spaces" in res["actionable_summary"].lower()

    def test_python_valid_code_has_no_analogy(self):
        """Clean valid Python code has None for real_world_analogy."""
        res = analyze_python_snippet('print("Hello, World!")')
        assert res["status"] == "valid"
        assert res["real_world_analogy"] is None
        assert res["actionable_summary"] is not None
        assert "cleanly" in res["actionable_summary"].lower()

    def test_java_missing_semicolon_has_analogy(self):
        """Java missing semicolon returns period analogy."""
        code = (
            "public class Main {\n"
            "    public static void main(String[] args) {\n"
            '        System.out.println("Hi")\n'
            "    }\n"
            "}"
        )
        res = analyze_java_snippet(code)
        assert res["status"] == "syntax_error"
        assert res["real_world_analogy"] is not None
        assert "period" in res["real_world_analogy"].lower()
        assert res["actionable_summary"] is not None
        assert "semicolon" in res["actionable_summary"].lower()

    def test_java_null_pointer_has_analogy(self):
        """Java NPE returns empty envelope analogy."""
        code = 'public class Main { public static void main(String[] args) { String s = null; s.equals("x"); } }'
        trace = 'Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.equals(Object)" because "s" is null'
        res = analyze_java_snippet(code, trace)
        assert res["error_category"] == "NullPointerException"
        assert res["real_world_analogy"] is not None
        assert "envelope" in res["real_world_analogy"].lower()
        assert res["actionable_summary"] is not None

    def test_java_ambiguous_has_no_misleading_analogy(self):
        """Java ambiguous snippet without compiler receives None for analogy."""
        code = "public class Foo { void bar() { unknownFunction(); } }"
        res = analyze_java_snippet(code)
        assert res["status"] == "ambiguous"
        assert res["real_world_analogy"] is None

    def test_java_valid_structure_has_no_analogy(self):
        """Clean valid Java structure has None for real_world_analogy."""
        code = 'public class Main { public static void main(String[] args) { System.out.println("Valid"); } }'
        res = analyze_java_snippet(code)
        assert res["status"] == "valid"
        assert res["real_world_analogy"] is None
        assert res["actionable_summary"] is not None
        assert "cleanly" in res["actionable_summary"].lower()
