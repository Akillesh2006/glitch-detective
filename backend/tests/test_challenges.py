"""Comprehensive test suite for Phase 2 Detective Mode challenge engine.

Covers:
- Challenge catalog template completeness and stable IDs
- Progressive hint delivery and answer concealment
- Deterministic solution verification (correct, incorrect, ambiguous)
- Tolerance of harmless formatting differences (whitespace, indentation, comments)
- Rejection of unrelated valid code
- Safe handling of empty and malformed submissions
- API routing, response models, query filtering, and 404 behavior
- Backwards compatibility with health and analyze endpoints
- Absolute zero code execution guarantee
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.engine.challenge_catalog import (
    CHALLENGE_CATALOG,
    get_challenge,
    get_challenge_detail,
    get_next_challenge,
    list_challenges,
)
from app.engine.challenge_verifier import verify_solution
from app.schemas import SupportedLanguage

client = TestClient(app)


class TestChallengeCatalog:
    """Tests for the static catalog, template structure, and answer concealment."""

    def test_catalog_has_expected_templates(self):
        """Catalog must contain 20 curated challenges: 10 Python and 10 Java across 3 tiers."""
        assert len(CHALLENGE_CATALOG) == 20
        python_challenges = [c for c in CHALLENGE_CATALOG.values() if c.language == SupportedLanguage.PYTHON]
        java_challenges = [c for c in CHALLENGE_CATALOG.values() if c.language == SupportedLanguage.JAVA]
        assert len(python_challenges) == 10
        assert len(java_challenges) == 10

        # Check difficulty tiers representation
        for lang_challenges in (python_challenges, java_challenges):
            tiers = {c.difficulty for c in lang_challenges}
            assert "beginner" in tiers
            assert "intermediate" in tiers
            assert "advanced" in tiers

    @pytest.mark.parametrize("challenge_id", list(CHALLENGE_CATALOG.keys()))
    def test_template_fields_validity(self, challenge_id: str):
        """Every challenge template must have complete, valid fields."""
        tmpl = get_challenge(challenge_id)
        assert tmpl is not None
        assert tmpl.id == challenge_id
        assert len(tmpl.title) > 5
        assert tmpl.language in (SupportedLanguage.PYTHON, SupportedLanguage.JAVA)
        assert tmpl.difficulty in ("beginner", "intermediate", "advanced")
        assert len(tmpl.category) > 0
        assert len(tmpl.scenario) > 15
        assert len(tmpl.buggy_code) > 10
        assert len(tmpl.expected_behavior) > 10
        assert len(tmpl.hints) >= 2
        assert len(tmpl.canonical_solutions) >= 1
        assert len(tmpl.bug_explanation) > 10
        assert len(tmpl.fix_rationale) > 10
        assert tmpl.real_world_analogy is not None


    def test_progressive_hints_concealment(self):
        """Progressive hints must only reveal requested hint levels and never future hints."""
        challenge_id = "py-receipt-unclosed-paren"

        # hint_level = 0 (no hints unlocked)
        detail_0 = get_challenge_detail(challenge_id, hint_level=0)
        assert detail_0 is not None
        assert detail_0.hint_level == 0
        assert detail_0.unlocked_hints == []
        assert detail_0.total_hints == 2

        # hint_level = 1 (first hint unlocked)
        detail_1 = get_challenge_detail(challenge_id, hint_level=1)
        assert detail_1 is not None
        assert detail_1.hint_level == 1
        assert len(detail_1.unlocked_hints) == 1
        assert "closing token" in detail_1.unlocked_hints[0]

        # hint_level = 2 (all hints unlocked)
        detail_2 = get_challenge_detail(challenge_id, hint_level=2)
        assert detail_2 is not None
        assert detail_2.hint_level == 2
        assert len(detail_2.unlocked_hints) == 2

        # hint_level = 99 (clamped to available hints)
        detail_99 = get_challenge_detail(challenge_id, hint_level=99)
        assert detail_99 is not None
        assert detail_99.hint_level == 2
        assert len(detail_99.unlocked_hints) == 2

    def test_challenge_detail_never_contains_solution(self):
        """Public ChallengeDetail model must not expose canonical solutions."""
        for cid in CHALLENGE_CATALOG:
            detail = get_challenge_detail(cid, hint_level=2)
            assert not hasattr(detail, "canonical_solutions")
            assert not hasattr(detail, "solution")
            assert "canonical_solutions" not in detail.model_dump()


class TestChallengeVerification:
    """Tests for deterministic solution verification."""

    # --- Python Challenge Verification Tests ---
    def test_py_receipt_correct_canonical(self):
        """Exact canonical solution passes."""
        cid = "py-receipt-unclosed-paren"
        canonical = CHALLENGE_CATALOG[cid].canonical_solutions[0]
        res = verify_solution(cid, canonical)
        assert res.passed is True
        assert res.status == "correct"
        assert "Case Solved" in res.message

    def test_py_receipt_tolerates_harmless_formatting(self):
        """Harmless formatting (extra spaces, comments) passes via AST normalization."""
        cid = "py-receipt-unclosed-paren"
        code_with_formatting = (
            "# Cashier fixed script\n"
            "def print_receipt(item_name, price, discount_rate):\n"
            "    final_price = price - ( price * discount_rate )\n"
            "    print( \"Item:\" , item_name , \"Final Price:\" , round( final_price , 2 ) )\n"
        )
        res = verify_solution(cid, code_with_formatting)
        assert res.passed is True
        assert res.status == "correct"

    def test_py_receipt_rejects_unfixed_bug(self):
        """Unfixed bug code returns incorrect status with syntax feedback."""
        cid = "py-receipt-unclosed-paren"
        buggy = CHALLENGE_CATALOG[cid].buggy_code
        res = verify_solution(cid, buggy)
        assert res.passed is False
        assert res.status == "incorrect"
        assert "syntax" in res.message.lower() or "syntax" in res.feedback.lower()

    def test_py_receipt_rejects_unrelated_valid_code(self):
        """Arbitrary valid Python code (e.g. x = 1) is rejected."""
        cid = "py-receipt-unclosed-paren"
        res = verify_solution(cid, "x = 42\nprint('Unrelated code')")
        assert res.passed is False
        assert res.status == "incorrect"
        assert "does not match the expected solution" in res.feedback.lower()

    def test_py_traffic_colon_solution(self):
        """Traffic gate missing colon solution passes."""
        cid = "py-traffic-missing-colon"
        fixed = (
            "def check_speed(speed_limit, current_speed):\n"
            "    if current_speed > speed_limit:\n"
            "        return \"Speed warning issued\"\n"
            "    return \"Speed is within limits\""
        )
        res = verify_solution(cid, fixed)
        assert res.passed is True
        assert res.status == "correct"

    def test_py_roster_indentation_solution(self):
        """Roster loop indentation solution passes."""
        cid = "py-roster-indentation"
        fixed = (
            "def announce_honor_roll(students):\n"
            "    for student in students:\n"
            "        print(\"Honor Roll:\", student)"
        )
        res = verify_solution(cid, fixed)
        assert res.passed is True
        assert res.status == "correct"

    def test_py_average_zerodivision_guard_solutions(self):
        """Both guard forms (if not transactions vs if len == 0) pass."""
        cid = "py-average-zerodivision"
        sol1 = (
            "def calculate_average_transaction(transactions):\n"
            "    if not transactions:\n"
            "        return 0.0\n"
            "    total = sum(transactions)\n"
            "    return total / len(transactions)"
        )
        sol2 = (
            "def calculate_average_transaction(transactions):\n"
            "    if len(transactions) == 0:\n"
            "        return 0.0\n"
            "    total = sum(transactions)\n"
            "    return total / len(transactions)"
        )
        assert verify_solution(cid, sol1).passed is True
        assert verify_solution(cid, sol2).passed is True

    # --- Java Challenge Verification Tests ---
    def test_java_semicolon_solution(self):
        """Java missing semicolon fix passes."""
        cid = "java-invoice-missing-semicolon"
        fixed = (
            "public class InvoicePrinter {\n"
            "    public static void main(String[] args) {\n"
            "        String client = \"Acme Corp\";\n"
            "        System.out.println(\"Processing invoice for: \" + client);\n"
            "    }\n"
            "}"
        )
        res = verify_solution(cid, fixed)
        assert res.passed is True
        assert res.status == "correct"

    def test_java_semicolon_harmless_formatting(self):
        """Java token normalization accepts different indentation, braces on newlines, and comments."""
        cid = "java-invoice-missing-semicolon"
        fixed_with_formatting = (
            "// Solved invoice terminator\n"
            "public class InvoicePrinter\n"
            "{\n"
            "  public static void main(String[] args)\n"
            "  {\n"
            "    String client = \"Acme Corp\";\n"
            "    System.out.println( \"Processing invoice for: \" + client );\n"
            "  }\n"
            "}\n"
        )
        res = verify_solution(cid, fixed_with_formatting)
        assert res.passed is True
        assert res.status == "correct"

    def test_java_semicolon_rejects_unfixed(self):
        """Unfixed Java semicolon code fails with compiler/syntax message."""
        cid = "java-invoice-missing-semicolon"
        buggy = CHALLENGE_CATALOG[cid].buggy_code
        res = verify_solution(cid, buggy)
        assert res.passed is False
        assert res.status == "incorrect"

    def test_java_null_pointer_solutions(self):
        """Both Yoda condition and null check pass for Java auth challenge."""
        cid = "java-auth-null-pointer"
        yoda_solution = (
            "public class AuthManager {\n"
            "    public static boolean checkAdmin(String username) {\n"
            "        return \"admin\".equals(username);\n"
            "    }\n"
            "}"
        )
        null_guard_solution = (
            "public class AuthManager {\n"
            "    public static boolean checkAdmin(String username) {\n"
            "        return username != null && username.equals(\"admin\");\n"
            "    }\n"
            "}"
        )
        assert verify_solution(cid, yoda_solution).passed is True
        assert verify_solution(cid, null_guard_solution).passed is True

    def test_java_null_pointer_still_vulnerable(self):
        """Submitting code that still calls username.equals() is flagged with targeted feedback."""
        cid = "java-auth-null-pointer"
        still_buggy = (
            "public class AuthManager {\n"
            "    public static boolean checkAdmin(String username) {\n"
            "        return username.equals(\"admin\"); // still buggy\n"
            "    }\n"
            "}"
        )
        res = verify_solution(cid, still_buggy)
        assert res.passed is False
        assert res.status == "incorrect"
        assert "null" in res.feedback.lower()

    def test_java_logger_capitalization_solution(self):
        """Capitalization of System passes."""
        cid = "java-logger-capitalization"
        fixed = (
            "public class ServiceLauncher {\n"
            "    public static void main(String[] args) {\n"
            "        System.out.println(\"Service initialized successfully.\");\n"
            "    }\n"
            "}"
        )
        res = verify_solution(cid, fixed)
        assert res.passed is True
        assert res.status == "correct"

    def test_java_wrapper_missing_class_solution(self):
        """Wrapping main in a class passes."""
        cid = "java-wrapper-missing-class"
        fixed = (
            "public class Main {\n"
            "    public static void main(String[] args) {\n"
            "        System.out.println(\"Testing standalone execution\");\n"
            "    }\n"
            "}"
        )
        res = verify_solution(cid, fixed)
        assert res.passed is True
        assert res.status == "correct"

    def test_java_rejects_unrelated_valid_code(self):
        """Arbitrary valid Java code is rejected."""
        cid = "java-invoice-missing-semicolon"
        unrelated = (
            "public class Calculator {\n"
            "    public static void main(String[] args) {\n"
            "        int x = 100;\n"
            "    }\n"
            "}"
        )
        res = verify_solution(cid, unrelated)
        assert res.passed is False
        assert res.status == "incorrect"

    # --- Edge Cases & Robustness ---
    def test_empty_and_blank_submissions(self):
        """Empty, whitespace-only, or blank submissions fail cleanly."""
        cid = "py-receipt-unclosed-paren"
        res_empty = verify_solution(cid, "")
        assert res_empty.passed is False
        assert res_empty.status == "incorrect"
        assert "empty" in res_empty.message.lower()

        res_spaces = verify_solution(cid, "   \n\t  ")
        assert res_spaces.passed is False
        assert res_spaces.status == "incorrect"

    def test_unknown_challenge_id(self):
        """Non-existent challenge returns ambiguous/not found status."""
        res = verify_solution("non-existent-id-123", "print('hello')")
        assert res.passed is False
        assert res.status == "ambiguous"
        assert "does not exist" in res.feedback.lower()

    @pytest.mark.parametrize("challenge_id", list(CHALLENGE_CATALOG.keys()))
    def test_every_challenge_canonical_solution_passes(self, challenge_id: str):
        """Every canonical solution for every challenge in the catalog must verify successfully."""
        tmpl = CHALLENGE_CATALOG[challenge_id]
        for canonical in tmpl.canonical_solutions:
            res = verify_solution(challenge_id, canonical)
            assert res.passed is True, f"Failed for challenge {challenge_id}: {res.feedback}"
            assert res.status == "correct"

    @pytest.mark.parametrize("challenge_id", list(CHALLENGE_CATALOG.keys()))
    def test_every_challenge_buggy_code_fails(self, challenge_id: str):
        """The uncorrected buggy code for every challenge must fail verification."""
        tmpl = CHALLENGE_CATALOG[challenge_id]
        res = verify_solution(challenge_id, tmpl.buggy_code)
        assert res.passed is False, f"Expected buggy code to fail for {challenge_id}"
        assert res.status in ("incorrect", "ambiguous")



class TestChallengeAPIEndpoints:
    """Tests for FastAPI HTTP challenge endpoints."""

    def test_list_challenges_endpoint(self):
        """GET /api/challenges returns all 20 challenges."""
        response = client.get("/api/challenges")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 20
        for item in data:
            assert "id" in item
            assert "title" in item
            assert "language" in item
            assert "difficulty" in item
            assert "category" in item
            assert "scenario" in item
            # Verify solution is NOT exposed in catalog
            assert "buggy_code" not in item
            assert "canonical_solutions" not in item

    def test_list_challenges_filter_language(self):
        """GET /api/challenges?language=python returns only Python challenges."""
        res = client.get("/api/challenges?language=python")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 10
        assert all(item["language"] == "python" for item in data)

        res_java = client.get("/api/challenges?language=java")
        assert res_java.status_code == 200
        assert len(res_java.json()) == 10
        assert all(item["language"] == "java" for item in res_java.json())

    def test_list_challenges_filter_difficulty(self):
        """GET /api/challenges?difficulty=... filters correctly."""
        for diff in ("beginner", "intermediate", "advanced"):
            res = client.get(f"/api/challenges?difficulty={diff}")
            assert res.status_code == 200
            items = res.json()
            assert len(items) > 0
            assert all(item["difficulty"].lower() == diff for item in items)


    def test_next_challenge_endpoint(self):
        """GET /api/challenges/next returns next challenge with hint_level=0."""
        response = client.get("/api/challenges/next?language=python")
        assert response.status_code == 200
        data = response.json()
        assert data["language"] == "python"
        assert data["hint_level"] == 0
        assert data["unlocked_hints"] == []
        assert data["total_hints"] >= 2
        assert len(data["buggy_code"]) > 0
        assert "canonical_solutions" not in data

    def test_next_challenge_deterministic_seed(self):
        """GET /api/challenges/next with seed rotates deterministically."""
        res_0 = client.get("/api/challenges/next?language=python&seed=0")
        res_1 = client.get("/api/challenges/next?language=python&seed=1")
        assert res_0.status_code == 200
        assert res_1.status_code == 200
        assert res_0.json()["id"] != res_1.json()["id"]

    def test_get_challenge_by_id_progressive_hints(self):
        """GET /api/challenges/{id} respects hint_level query param."""
        cid = "py-traffic-missing-colon"
        
        # hint_level = 0
        res0 = client.get(f"/api/challenges/{cid}")
        assert res0.status_code == 200
        assert len(res0.json()["unlocked_hints"]) == 0

        # hint_level = 1
        res1 = client.get(f"/api/challenges/{cid}?hint_level=1")
        assert res1.status_code == 200
        assert len(res1.json()["unlocked_hints"]) == 1

        # hint_level = 2
        res2 = client.get(f"/api/challenges/{cid}?hint_level=2")
        assert res2.status_code == 200
        assert len(res2.json()["unlocked_hints"]) == 2

    def test_get_challenge_by_id_404(self):
        """GET /api/challenges/{id} returns 404 for unknown challenge."""
        res = client.get("/api/challenges/unknown-mystery-id")
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()

    def test_verify_solution_path_endpoint(self):
        """POST /api/challenges/{id}/verify verifies solution."""
        cid = "py-traffic-missing-colon"
        fixed = (
            "def check_speed(speed_limit, current_speed):\n"
            "    if current_speed > speed_limit:\n"
            "        return \"Speed warning issued\"\n"
            "    return \"Speed is within limits\""
        )
        res = client.post(
            f"/api/challenges/{cid}/verify",
            json={"code": fixed},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["passed"] is True
        assert data["status"] == "correct"

    def test_verify_solution_body_endpoint(self):
        """POST /api/challenges/verify verifies solution with challenge_id in body."""
        cid = "py-traffic-missing-colon"
        fixed = (
            "def check_speed(speed_limit, current_speed):\n"
            "    if current_speed > speed_limit:\n"
            "        return \"Speed warning issued\"\n"
            "    return \"Speed is within limits\""
        )
        res = client.post(
            "/api/challenges/verify",
            json={"challenge_id": cid, "code": fixed},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["passed"] is True
        assert data["status"] == "correct"

    def test_verify_solution_rejects_blank_body(self):
        """Validation fails with 422 if code is empty or whitespace."""
        res = client.post(
            "/api/challenges/py-traffic-missing-colon/verify",
            json={"code": "   "},
        )
        assert res.status_code == 422

    def test_verify_solution_rejects_null_bytes(self):
        """Null byte injection is rejected with 422 validation error."""
        res = client.post(
            "/api/challenges/py-traffic-missing-colon/verify",
            json={"code": "def check_speed():\x00 pass"},
        )
        assert res.status_code == 422

    def test_backward_compatibility_existing_endpoints(self):
        """Existing /api/health and /api/analyze endpoints remain completely functional."""
        health_res = client.get("/api/health")
        assert health_res.status_code == 200
        assert health_res.json()["status"] == "ok"

        analyze_res = client.post(
            "/api/analyze",
            json={"language": "python", "code": 'print("Hello"'},
        )
        assert analyze_res.status_code == 200
        data = analyze_res.json()
        assert data["status"] == "syntax_error"
        assert data["real_world_analogy"] is not None
        assert data["actionable_summary"] is not None

    @pytest.mark.parametrize("challenge_id", list(CHALLENGE_CATALOG.keys()))
    def test_reveal_solution_endpoint_valid(self, challenge_id: str):
        """GET /api/challenges/{id}/solution returns canonical solution and rationale."""
        res = client.get(f"/api/challenges/{challenge_id}/solution")
        assert res.status_code == 200
        data = res.json()
        assert data["challenge_id"] == challenge_id
        assert len(data["title"]) > 0
        assert len(data["canonical_solution"]) > 10
        assert len(data["bug_explanation"]) > 10
        assert len(data["fix_rationale"]) > 10
        assert "real_world_analogy" in data

    def test_reveal_solution_endpoint_404(self):
        """GET /api/challenges/{id}/solution returns 404 for unknown challenge."""
        res = client.get("/api/challenges/nonexistent-mystery-id/solution")
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()

    def test_ordinary_endpoints_never_contain_canonical_solution(self):
        """Ordinary GET /api/challenges, /api/challenges/next, and /api/challenges/{id} never expose solutions."""
        # 1. Catalog list
        list_res = client.get("/api/challenges")
        assert list_res.status_code == 200
        for item in list_res.json():
            assert "canonical_solution" not in item
            assert "canonical_solutions" not in item
            assert "solution" not in item

        # 2. Next challenge
        next_res = client.get("/api/challenges/next?language=python")
        assert next_res.status_code == 200
        assert "canonical_solution" not in next_res.json()
        assert "canonical_solutions" not in next_res.json()

        # 3. Challenge detail with all hints unlocked
        detail_res = client.get("/api/challenges/py-receipt-unclosed-paren?hint_level=2")
        assert detail_res.status_code == 200
        assert "canonical_solution" not in detail_res.json()
        assert "canonical_solutions" not in detail_res.json()

