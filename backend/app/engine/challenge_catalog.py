"""Catalog of curated debugging challenges for Detective Mode.

Contains deterministic challenge templates, progressive hints, and canonical
solutions for Python and Java.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from app.schemas import (
    ChallengeDetail,
    ChallengeSummary,
    SupportedLanguage,
)


@dataclass
class ChallengeTemplate:
    """Internal representation of a debugging mystery template."""
    id: str
    title: str
    language: SupportedLanguage
    difficulty: str
    category: str
    scenario: str
    buggy_code: str
    expected_behavior: str
    hints: List[str]
    canonical_solutions: List[str]
    tags: List[str] = field(default_factory=list)

    def to_summary(self) -> ChallengeSummary:
        """Convert to public catalog summary without code or hints."""
        return ChallengeSummary(
            id=self.id,
            title=self.title,
            language=self.language,
            difficulty=self.difficulty,
            category=self.category,
            scenario=self.scenario,
        )

    def to_detail(self, hint_level: int = 0) -> ChallengeDetail:
        """Convert to public detail view with progressive hints, concealing solutions."""
        clamped_level = max(0, min(hint_level, len(self.hints)))
        unlocked = self.hints[:clamped_level]
        return ChallengeDetail(
            id=self.id,
            title=self.title,
            language=self.language,
            difficulty=self.difficulty,
            category=self.category,
            scenario=self.scenario,
            buggy_code=self.buggy_code,
            expected_behavior=self.expected_behavior,
            total_hints=len(self.hints),
            unlocked_hints=unlocked,
            hint_level=clamped_level,
        )


# Curated beginner challenge templates
CHALLENGE_CATALOG: Dict[str, ChallengeTemplate] = {
    # -----------------------------------------------------------------------
    # Python Challenges
    # -----------------------------------------------------------------------
    "py-receipt-unclosed-paren": ChallengeTemplate(
        id="py-receipt-unclosed-paren",
        title="The Mystery of the Silent Receipt",
        language=SupportedLanguage.PYTHON,
        difficulty="beginner",
        category="SyntaxError: Unclosed Delimiter",
        scenario=(
            "A retail register discount script crashed right when printing the final bill "
            "for a customer. The cashier reported that the receipt never printed."
        ),
        buggy_code=(
            "def print_receipt(item_name, price, discount_rate):\n"
            "    final_price = price - (price * discount_rate)\n"
            "    print(\"Item:\", item_name, \"Final Price:\", round(final_price, 2)"
        ),
        expected_behavior="The receipt prints the item name and rounded price without raising a SyntaxError.",
        hints=[
            "Look at the print statement on line 3. Python is scanning for a closing token before the statement ends.",
            "Count the opening parentheses on line 3: one after print, one after round. How many closing parentheses are there?",
        ],
        canonical_solutions=[
            (
                "def print_receipt(item_name, price, discount_rate):\n"
                "    final_price = price - (price * discount_rate)\n"
                "    print(\"Item:\", item_name, \"Final Price:\", round(final_price, 2))"
            ),
        ],
        tags=["python", "syntax", "delimiters", "parentheses"],
    ),

    "py-traffic-missing-colon": ChallengeTemplate(
        id="py-traffic-missing-colon",
        title="The Mystery of the Highway Gate",
        language=SupportedLanguage.PYTHON,
        difficulty="beginner",
        category="SyntaxError: Missing Colon",
        scenario=(
            "An automated toll gate speed camera script stopped evaluating incoming vehicles "
            "due to a syntax issue in its conditional check."
        ),
        buggy_code=(
            "def check_speed(speed_limit, current_speed):\n"
            "    if current_speed > speed_limit\n"
            "        return \"Speed warning issued\"\n"
            "    return \"Speed is within limits\""
        ),
        expected_behavior="Return 'Speed warning issued' when speed exceeds limit, otherwise 'Speed is within limits'.",
        hints=[
            "In Python, header lines for compound statements like 'if', 'for', and 'def' require a terminating punctuation mark.",
            "Add a colon ':' at the end of the 'if current_speed > speed_limit' header on line 2.",
        ],
        canonical_solutions=[
            (
                "def check_speed(speed_limit, current_speed):\n"
                "    if current_speed > speed_limit:\n"
                "        return \"Speed warning issued\"\n"
                "    return \"Speed is within limits\""
            ),
        ],
        tags=["python", "syntax", "colon", "conditionals"],
    ),

    "py-roster-indentation": ChallengeTemplate(
        id="py-roster-indentation",
        title="The Mystery of the Misplaced Student",
        language=SupportedLanguage.PYTHON,
        difficulty="beginner",
        category="IndentationError",
        scenario=(
            "A school gradebook export script fails to run because the statements inside "
            "the loop were not aligned properly."
        ),
        buggy_code=(
            "def announce_honor_roll(students):\n"
            "    for student in students:\n"
            "    print(\"Honor Roll:\", student)"
        ),
        expected_behavior="Iterate through each student in the list and print their name with the 'Honor Roll:' prefix.",
        hints=[
            "Python uses indentation to determine which statements belong inside a loop block.",
            "Indent the print statement on line 3 with 4 spaces under the 'for student in students:' loop.",
        ],
        canonical_solutions=[
            (
                "def announce_honor_roll(students):\n"
                "    for student in students:\n"
                "        print(\"Honor Roll:\", student)"
            ),
        ],
        tags=["python", "syntax", "indentation", "loops"],
    ),

    "py-average-zerodivision": ChallengeTemplate(
        id="py-average-zerodivision",
        title="The Mystery of the Empty Ledger",
        language=SupportedLanguage.PYTHON,
        difficulty="beginner",
        category="ZeroDivisionError",
        scenario=(
            "A banking ledger summary function crashes with a ZeroDivisionError when calculating "
            "the average transaction amount on a newly opened account with zero transactions."
        ),
        buggy_code=(
            "def calculate_average_transaction(transactions):\n"
            "    total = sum(transactions)\n"
            "    return total / len(transactions)"
        ),
        expected_behavior="Safely return 0.0 if transactions is empty, otherwise return the calculated average.",
        hints=[
            "When transactions is an empty list, len(transactions) is 0. Dividing any number by 0 crashes Python.",
            "Add a guard clause: if not transactions (or if len(transactions) == 0), return 0.0 before dividing.",
        ],
        canonical_solutions=[
            (
                "def calculate_average_transaction(transactions):\n"
                "    if not transactions:\n"
                "        return 0.0\n"
                "    total = sum(transactions)\n"
                "    return total / len(transactions)"
            ),
            (
                "def calculate_average_transaction(transactions):\n"
                "    if len(transactions) == 0:\n"
                "        return 0.0\n"
                "    total = sum(transactions)\n"
                "    return total / len(transactions)"
            ),
            (
                "def calculate_average_transaction(transactions):\n"
                "    if not transactions:\n"
                "        return 0\n"
                "    total = sum(transactions)\n"
                "    return total / len(transactions)"
            ),
            (
                "def calculate_average_transaction(transactions):\n"
                "    if len(transactions) == 0:\n"
                "        return 0\n"
                "    total = sum(transactions)\n"
                "    return total / len(transactions)"
            ),
        ],
        tags=["python", "runtime", "zerodivision", "guard-clause"],
    ),

    # -----------------------------------------------------------------------
    # Java Challenges
    # -----------------------------------------------------------------------
    "java-invoice-missing-semicolon": ChallengeTemplate(
        id="java-invoice-missing-semicolon",
        title="The Case of the Runaway Invoice",
        language=SupportedLanguage.JAVA,
        difficulty="beginner",
        category="JavaSyntaxError: Missing Semicolon",
        scenario=(
            "An accounting batch service fails to compile because a statement "
            "does not conclude with the required Java terminator."
        ),
        buggy_code=(
            "public class InvoicePrinter {\n"
            "    public static void main(String[] args) {\n"
            "        String client = \"Acme Corp\";\n"
            "        System.out.println(\"Processing invoice for: \" + client)\n"
            "    }\n"
            "}"
        ),
        expected_behavior="Print 'Processing invoice for: Acme Corp' cleanly without compiler syntax errors.",
        hints=[
            "Unlike Python, Java requires every executable statement line to terminate with a specific punctuation mark.",
            "Look at line 4. Append a semicolon ';' to the end of the System.out.println call.",
        ],
        canonical_solutions=[
            (
                "public class InvoicePrinter {\n"
                "    public static void main(String[] args) {\n"
                "        String client = \"Acme Corp\";\n"
                "        System.out.println(\"Processing invoice for: \" + client);\n"
                "    }\n"
                "}"
            ),
        ],
        tags=["java", "syntax", "semicolon"],
    ),

    "java-auth-null-pointer": ChallengeTemplate(
        id="java-auth-null-pointer",
        title="The Case of the Phantom Admin",
        language=SupportedLanguage.JAVA,
        difficulty="beginner",
        category="NullPointerException",
        scenario=(
            "An authentication filter crashes with a NullPointerException when an "
            "unauthenticated session passes a null username."
        ),
        buggy_code=(
            "public class AuthManager {\n"
            "    public static boolean checkAdmin(String username) {\n"
            "        return username.equals(\"admin\");\n"
            "    }\n"
            "}"
        ),
        expected_behavior="Return false safely when username is null, and true only when username equals 'admin'.",
        hints=[
            "Invoking .equals() on a variable whose value is null causes a NullPointerException in Java.",
            "Use '\"admin\".equals(username)' (literals are never null) or add 'username != null && username.equals(\"admin\")'.",
        ],
        canonical_solutions=[
            (
                "public class AuthManager {\n"
                "    public static boolean checkAdmin(String username) {\n"
                "        return \"admin\".equals(username);\n"
                "    }\n"
                "}"
            ),
            (
                "public class AuthManager {\n"
                "    public static boolean checkAdmin(String username) {\n"
                "        return username != null && username.equals(\"admin\");\n"
                "    }\n"
                "}"
            ),
            (
                "public class AuthManager {\n"
                "    public static boolean checkAdmin(String username) {\n"
                "        if (username == null) {\n"
                "            return false;\n"
                "        }\n"
                "        return username.equals(\"admin\");\n"
                "    }\n"
                "}"
            ),
        ],
        tags=["java", "runtime", "npe", "null-pointer", "yoda-condition"],
    ),

    "java-logger-capitalization": ChallengeTemplate(
        id="java-logger-capitalization",
        title="The Case of the Silent Logger",
        language=SupportedLanguage.JAVA,
        difficulty="beginner",
        category="JavaSyntaxError: Capitalization",
        scenario=(
            "A backend service startup log fails to compile because of a case-sensitivity "
            "typo in the standard library class."
        ),
        buggy_code=(
            "public class ServiceLauncher {\n"
            "    public static void main(String[] args) {\n"
            "        system.out.println(\"Service initialized successfully.\");\n"
            "    }\n"
            "}"
        ),
        expected_behavior="Compile cleanly and print the initialization message.",
        hints=[
            "Java is strictly case-sensitive. Standard library class names in java.lang begin with an uppercase letter.",
            "Capitalize 'system' to 'System' on line 3.",
        ],
        canonical_solutions=[
            (
                "public class ServiceLauncher {\n"
                "    public static void main(String[] args) {\n"
                "        System.out.println(\"Service initialized successfully.\");\n"
                "    }\n"
                "}"
            ),
        ],
        tags=["java", "syntax", "capitalization", "case-sensitive"],
    ),

    "java-wrapper-missing-class": ChallengeTemplate(
        id="java-wrapper-missing-class",
        title="The Case of the Stray Main",
        language=SupportedLanguage.JAVA,
        difficulty="beginner",
        category="JavaStructureError: Missing Class",
        scenario=(
            "A developer submitted executable Java statements without enclosing them "
            "in a class definition, causing compilation to fail."
        ),
        buggy_code=(
            "public static void main(String[] args) {\n"
            "    System.out.println(\"Testing standalone execution\");\n"
            "}"
        ),
        expected_behavior="Enclose the main method inside a valid class definition.",
        hints=[
            "In Java, methods cannot float freely outside a class. Every method must reside inside a class definition.",
            "Wrap the main method inside 'public class Main { ... }' or 'public class Solution { ... }'.",
        ],
        canonical_solutions=[
            (
                "public class Main {\n"
                "    public static void main(String[] args) {\n"
                "        System.out.println(\"Testing standalone execution\");\n"
                "    }\n"
                "}"
            ),
            (
                "public class Solution {\n"
                "    public static void main(String[] args) {\n"
                "        System.out.println(\"Testing standalone execution\");\n"
                "    }\n"
                "}"
            ),
        ],
        tags=["java", "structure", "classes"],
    ),
}


def list_challenges(
    language: Optional[SupportedLanguage] = None,
    difficulty: Optional[str] = None,
) -> List[ChallengeSummary]:
    """Retrieve filtered catalog summaries."""
    results: List[ChallengeSummary] = []
    for template in CHALLENGE_CATALOG.values():
        if language and template.language != language:
            continue
        if difficulty and template.difficulty.lower() != difficulty.lower():
            continue
        results.append(template.to_summary())
    return results


def get_challenge(challenge_id: str) -> Optional[ChallengeTemplate]:
    """Retrieve full template by ID (internal use)."""
    return CHALLENGE_CATALOG.get(challenge_id)


def get_challenge_detail(challenge_id: str, hint_level: int = 0) -> Optional[ChallengeDetail]:
    """Retrieve public challenge detail by ID with progressive hints."""
    template = get_challenge(challenge_id)
    if not template:
        return None
    return template.to_detail(hint_level=hint_level)


def get_next_challenge(
    language: Optional[SupportedLanguage] = None,
    difficulty: Optional[str] = None,
    seed: Optional[int] = None,
) -> Optional[ChallengeDetail]:
    """Get next challenge matching criteria deterministically using seed."""
    matching = [
        tpl for tpl in CHALLENGE_CATALOG.values()
        if (language is None or tpl.language == language)
        and (difficulty is None or tpl.difficulty.lower() == difficulty.lower())
    ]
    if not matching:
        return None

    index = 0
    if seed is not None:
        index = seed % len(matching)
    return matching[index].to_detail(hint_level=0)
