"""Catalog of curated debugging challenges for Detective Mode.

Contains deterministic challenge templates, progressive hints, and canonical
solutions for Python and Java across beginner, intermediate, and advanced tiers.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from app.schemas import (
    ChallengeDetail,
    ChallengeSolutionResponse,
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
    bug_explanation: str = ""
    fix_rationale: str = ""
    real_world_analogy: Optional[str] = None
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

    def to_solution(self) -> ChallengeSolutionResponse:
        """Convert to solution revelation model with canonical code and pedagogical explanations."""
        return ChallengeSolutionResponse(
            challenge_id=self.id,
            title=self.title,
            canonical_solution=self.canonical_solutions[0] if self.canonical_solutions else "",
            bug_explanation=self.bug_explanation,
            fix_rationale=self.fix_rationale,
            real_world_analogy=self.real_world_analogy,
        )


# Curated challenge catalog: 10 Python + 10 Java across Beginner, Intermediate, and Advanced tiers
CHALLENGE_CATALOG: Dict[str, ChallengeTemplate] = {
    # =======================================================================
    # Python Challenges (10 total: 4 Beginner, 4 Intermediate, 2 Advanced)
    # =======================================================================
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
            "Count the opening parentheses on line 3: one after print, one after round. Append a second closing parenthesis ')' at the end.",
        ],
        canonical_solutions=[
            (
                "def print_receipt(item_name, price, discount_rate):\n"
                "    final_price = price - (price * discount_rate)\n"
                "    print(\"Item:\", item_name, \"Final Price:\", round(final_price, 2))"
            ),
        ],
        bug_explanation="An unclosed opening parenthesis on line 3 prevents Python from completing the print() statement.",
        fix_rationale="Appending the matching closing delimiter ')' completes the outer print() invocation.",
        real_world_analogy="Like opening a pair of quotation marks in a sentence and forgetting to close them before the period.",
        tags=["python", "syntax", "delimiters", "parentheses", "beginner"],
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
        bug_explanation="The header of an if statement in Python must conclude with a colon ':' to introduce the nested branch block.",
        fix_rationale="Adding a colon at the end of line 2 establishes a syntactically valid conditional block header.",
        real_world_analogy="Like a chapter title without punctuation separating it from the chapter paragraphs.",
        tags=["python", "syntax", "colon", "conditionals", "beginner"],
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
        bug_explanation="Statements within a loop body must be indented consistently to establish their block membership.",
        fix_rationale="Indenting the print statement by 4 spaces places it properly inside the for loop body.",
        real_world_analogy="Like bullet points printed flush with the margin instead of indented under their header.",
        tags=["python", "syntax", "indentation", "loops", "beginner"],
    ),

    "py-temp-precedence": ChallengeTemplate(
        id="py-temp-precedence",
        title="The Mystery of the Freezing Furnace",
        language=SupportedLanguage.PYTHON,
        difficulty="beginner",
        category="Operator Precedence",
        scenario=(
            "An HVAC thermal controller converts temperature readings from Fahrenheit to Celsius, "
            "but computes extreme negative readings because operations execute in the wrong order."
        ),
        buggy_code=(
            "def fahrenheit_to_celsius(fahrenheit):\n"
            "    return fahrenheit - 32 * 5 / 9"
        ),
        expected_behavior="Convert Fahrenheit to Celsius by subtracting 32 before multiplying by 5/9.",
        hints=[
            "In Python arithmetic, multiplication and division take precedence over subtraction. Currently, 32 * 5 / 9 evaluates first.",
            "Wrap the subtraction expression in parentheses: '(fahrenheit - 32)' so it computes before the scaling.",
        ],
        canonical_solutions=[
            (
                "def fahrenheit_to_celsius(fahrenheit):\n"
                "    return (fahrenheit - 32) * 5 / 9"
            ),
            (
                "def fahrenheit_to_celsius(fahrenheit):\n"
                "    return ((fahrenheit - 32) * 5) / 9"
            ),
            (
                "def fahrenheit_to_celsius(fahrenheit):\n"
                "    return (fahrenheit - 32) * 5.0 / 9.0"
            ),
        ],
        bug_explanation="Multiplication and division have higher precedence than subtraction, evaluating 32 * 5 / 9 before subtracting from fahrenheit.",
        fix_rationale="Parenthesizing (fahrenheit - 32) forces subtraction to occur first before scaling by 5/9.",
        real_world_analogy="Like calculating your tax discount after charging tax rather than before, reversing the equation.",
        tags=["python", "arithmetic", "precedence", "beginner"],
    ),

    "py-average-zerodivision": ChallengeTemplate(
        id="py-average-zerodivision",
        title="The Mystery of the Empty Ledger",
        language=SupportedLanguage.PYTHON,
        difficulty="intermediate",
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
        ],
        bug_explanation="When transactions is empty, len(transactions) is 0, raising an unhandled ZeroDivisionError.",
        fix_rationale="A guard clause checking for an empty list safely returns 0.0 before division can occur.",
        real_world_analogy="Like attempting to divide a restaurant check among zero diners.",
        tags=["python", "runtime", "zerodivision", "guard-clause", "intermediate"],
    ),

    "py-countdown-loop-boundary": ChallengeTemplate(
        id="py-countdown-loop-boundary",
        title="The Mystery of the Stalled Rocket",
        language=SupportedLanguage.PYTHON,
        difficulty="intermediate",
        category="Off-by-One Loop Boundary",
        scenario=(
            "A launchpad telemetry countdown generator excludes zero from the blastoff sequence "
            "because the range boundary terminates one step too early."
        ),
        buggy_code=(
            "def generate_countdown(start):\n"
            "    numbers = []\n"
            "    for i in range(start, 0, -1):\n"
            "        numbers.append(i)\n"
            "    return numbers"
        ),
        expected_behavior="Generate countdown list from start all the way down to and including 0.",
        hints=[
            "In Python, range(start, stop, step) excludes the stop value. Stopping at 0 terminates at 1, omitting 0.",
            "Change the stop argument from 0 to -1 so the loop decrements all the way down to include 0.",
        ],
        canonical_solutions=[
            (
                "def generate_countdown(start):\n"
                "    numbers = []\n"
                "    for i in range(start, -1, -1):\n"
                "        numbers.append(i)\n"
                "    return numbers"
            ),
        ],
        bug_explanation="In Python, range(start, stop, step) is exclusive of stop. When stop is 0, the loop halts at 1.",
        fix_rationale="Changing the stop boundary to -1 ensures 0 is appended as the final number in the countdown.",
        real_world_analogy="Like a timer that rings at '1 second remaining' instead of counting all the way to zero.",
        tags=["python", "loops", "range", "off-by-one", "intermediate"],
    ),

    "py-vault-keyerror": ChallengeTemplate(
        id="py-vault-keyerror",
        title="The Mystery of the Missing Vault Key",
        language=SupportedLanguage.PYTHON,
        difficulty="intermediate",
        category="Dictionary KeyError",
        scenario=(
            "A facility security clearance lookup crashes with a KeyError whenever an unregistered guest "
            "scans an unrecognized badge ID."
        ),
        buggy_code=(
            "def get_clearance_tier(badge_records, badge_id):\n"
            "    return badge_records[badge_id]"
        ),
        expected_behavior="Return the badge clearance tier if registered, or default to 'Guest' without crashing.",
        hints=[
            "Indexing a dictionary directly with badge_records[badge_id] raises a KeyError if the key is absent.",
            "Use the dictionary's .get() method: badge_records.get(badge_id, 'Guest') to provide a safe fallback.",
        ],
        canonical_solutions=[
            (
                "def get_clearance_tier(badge_records, badge_id):\n"
                "    return badge_records.get(badge_id, \"Guest\")"
            ),
            (
                "def get_clearance_tier(badge_records, badge_id):\n"
                "    if badge_id in badge_records:\n"
                "        return badge_records[badge_id]\n"
                "    return \"Guest\""
            ),
            (
                "def get_clearance_tier(badge_records, badge_id):\n"
                "    return badge_records.get(badge_id, None)"
            ),
        ],
        bug_explanation="Direct dictionary lookup dict[key] raises a KeyError when the key does not exist.",
        fix_rationale="Using dict.get(key, default) gracefully returns a fallback value when the key is not present.",
        real_world_analogy="Like asking a receptionist for a visitor pass when your name is not on the VIP guest list.",
        tags=["python", "dictionary", "keyerror", "collections", "intermediate"],
    ),

    "py-ticket-palindrome-case": ChallengeTemplate(
        id="py-ticket-palindrome-case",
        title="The Mystery of the Mismatched Ticket",
        language=SupportedLanguage.PYTHON,
        difficulty="intermediate",
        category="String Normalization",
        scenario=(
            "A transit turnstile validator rejects palindromic ticket codes like 'Radar' or 'Kayak' "
            "because case sensitivity causes mirror comparison to fail."
        ),
        buggy_code=(
            "def is_valid_ticket(code):\n"
            "    return code == code[::-1]"
        ),
        expected_behavior="Return True for case-insensitive palindromes, and False otherwise.",
        hints=[
            "In Python, uppercase and lowercase letters have different character codes ('R' != 'r').",
            "Convert the code string to lowercase using .lower() before comparing it with its reversed slice.",
        ],
        canonical_solutions=[
            (
                "def is_valid_ticket(code):\n"
                "    normalized = code.lower()\n"
                "    return normalized == normalized[::-1]"
            ),
            (
                "def is_valid_ticket(code):\n"
                "    return code.lower() == code.lower()[::-1]"
            ),
        ],
        bug_explanation="Direct slice reversal is case-sensitive, so 'Radar' does not match 'radaR'.",
        fix_rationale="Converting the input to lowercase with .lower() normalizes casing before mirror comparison.",
        real_world_analogy="Like comparing a printed signature where an uppercase initial letter hides that the word is symmetric.",
        tags=["python", "strings", "normalization", "palindromes", "intermediate"],
    ),

    "py-cart-default-mutable": ChallengeTemplate(
        id="py-cart-default-mutable",
        title="The Mystery of the Ghost Cart",
        language=SupportedLanguage.PYTHON,
        difficulty="advanced",
        category="Mutable Default Argument",
        scenario=(
            "An e-commerce cart microservice leaks items from previous shoppers into new sessions "
            "because the cart list was created as a mutable default parameter."
        ),
        buggy_code=(
            "def add_to_cart(item, cart=[]):\n"
            "    cart.append(item)\n"
            "    return cart"
        ),
        expected_behavior="Initialize a fresh, isolated cart list for each caller when no cart is provided.",
        hints=[
            "Python evaluates default function arguments once when the function is defined, sharing mutable objects across calls.",
            "Set cart=None as the default parameter, and initialize 'cart = []' inside the function body if cart is None.",
        ],
        canonical_solutions=[
            (
                "def add_to_cart(item, cart=None):\n"
                "    if cart is None:\n"
                "        cart = []\n"
                "    cart.append(item)\n"
                "    return cart"
            ),
            (
                "def add_to_cart(item, cart=None):\n"
                "    if not cart:\n"
                "        cart = []\n"
                "    cart.append(item)\n"
                "    return cart"
            ),
        ],
        bug_explanation="Default arguments are instantiated once at function definition time. A mutable list [] is shared across all calls.",
        fix_rationale="Using cart=None and initializing cart = [] inside the function creates an isolated list instance per call.",
        real_world_analogy="Like handing every new grocery shopper the same physical cart without emptying it between shoppers.",
        tags=["python", "advanced", "mutable-defaults", "functions"],
    ),

    "py-payroll-missing-return": ChallengeTemplate(
        id="py-payroll-missing-return",
        title="The Mystery of the Vanishing Bonus",
        language=SupportedLanguage.PYTHON,
        difficulty="advanced",
        category="Missing Return Value",
        scenario=(
            "A quarterly payroll calculation computes performance bonuses for employees, "
            "but all workers receive $0 because the function fails to return the computed result."
        ),
        buggy_code=(
            "def calculate_bonus(salary, performance_score):\n"
            "    if performance_score >= 90:\n"
            "        bonus = salary * 0.15\n"
            "    elif performance_score >= 75:\n"
            "        bonus = salary * 0.10\n"
            "    else:\n"
            "        bonus = salary * 0.05"
        ),
        expected_behavior="Return the computed bonus amount to the caller.",
        hints=[
            "Variables computed inside a function scope are discarded when the function exits unless returned explicitly.",
            "Add 'return bonus' at the end of the function, or return the calculated expression from each branch.",
        ],
        canonical_solutions=[
            (
                "def calculate_bonus(salary, performance_score):\n"
                "    if performance_score >= 90:\n"
                "        bonus = salary * 0.15\n"
                "    elif performance_score >= 75:\n"
                "        bonus = salary * 0.10\n"
                "    else:\n"
                "        bonus = salary * 0.05\n"
                "    return bonus"
            ),
            (
                "def calculate_bonus(salary, performance_score):\n"
                "    if performance_score >= 90:\n"
                "        return salary * 0.15\n"
                "    elif performance_score >= 75:\n"
                "        return salary * 0.10\n"
                "    else:\n"
                "        return salary * 0.05"
            ),
        ],
        bug_explanation="Python functions without an explicit return statement return None by default. The computed bonus was never returned.",
        fix_rationale="Adding 'return bonus' yields the calculated dollar amount back to the caller.",
        real_world_analogy="Like calculating change in a cash register and leaving it in the drawer instead of handing it to the customer.",
        tags=["python", "advanced", "return-values", "scope"],
    ),

    # =======================================================================
    # Java Challenges (10 total: 4 Beginner, 4 Intermediate, 2 Advanced)
    # =======================================================================
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
        bug_explanation="Line 4 lacks a terminating semicolon, which Java requires for all expression statements.",
        fix_rationale="Adding a semicolon ';' terminates the println statement, allowing compilation.",
        real_world_analogy="Like leaving off the final period in a legal contract sentence.",
        tags=["java", "syntax", "semicolon", "beginner"],
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
        bug_explanation="Java standard library class names are case-sensitive; 'system' with a lowercase 's' is unrecognized.",
        fix_rationale="Capitalizing 'System' correctly references the java.lang.System class.",
        real_world_analogy="Like addressing a letter with a misspelled recipient name that the postal carrier cannot find.",
        tags=["java", "syntax", "capitalization", "case-sensitive", "beginner"],
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
        bug_explanation="In Java, all methods must be declared inside an enclosing class definition.",
        fix_rationale="Enclosing the method inside 'public class Main { ... }' provides the required class wrapper.",
        real_world_analogy="Like trying to install an engine without mounting it inside a vehicle chassis.",
        tags=["java", "structure", "classes", "beginner"],
    ),

    "java-stock-type-mismatch": ChallengeTemplate(
        id="java-stock-type-mismatch",
        title="The Case of the Incompatible Counter",
        language=SupportedLanguage.JAVA,
        difficulty="beginner",
        category="JavaSyntaxError: Type Mismatch",
        scenario=(
            "A warehouse restock calculation fails to compile because a floating-point product "
            "is assigned directly to an integer variable without explicit casting."
        ),
        buggy_code=(
            "public class StockCounter {\n"
            "    public static int calculateRestock(int currentStock, double multiplier) {\n"
            "        int result = currentStock * multiplier;\n"
            "        return result;\n"
            "    }\n"
            "}"
        ),
        expected_behavior="Cast the floating-point calculation explicitly to integer and return it.",
        hints=[
            "Multiplying an int by a double yields a double. Assigning a double to an int variable causes a compiler error.",
            "Cast the product using '(int) (currentStock * multiplier)' before assigning it to result.",
        ],
        canonical_solutions=[
            (
                "public class StockCounter {\n"
                "    public static int calculateRestock(int currentStock, double multiplier) {\n"
                "        int result = (int) (currentStock * multiplier);\n"
                "        return result;\n"
                "    }\n"
                "}"
            ),
            (
                "public class StockCounter {\n"
                "    public static int calculateRestock(int currentStock, double multiplier) {\n"
                "        return (int) (currentStock * multiplier);\n"
                "    }\n"
                "}"
            ),
        ],
        bug_explanation="Multiplying an int by a double produces a double; assigning it to an int causes a loss of precision error.",
        fix_rationale="Explicitly casting with (int) instructs Java to truncate the floating-point value to an integer.",
        real_world_analogy="Like pouring water from a large beaker into an integer-marked test tube; you must confirm the truncation.",
        tags=["java", "types", "casting", "type-mismatch", "beginner"],
    ),

    "java-auth-null-pointer": ChallengeTemplate(
        id="java-auth-null-pointer",
        title="The Case of the Phantom Admin",
        language=SupportedLanguage.JAVA,
        difficulty="intermediate",
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
        bug_explanation="Invoking .equals() on a null reference throws a NullPointerException at runtime.",
        fix_rationale="Invoking .equals() from the non-null string literal \"admin\" or guarding with username != null safely avoids the exception.",
        real_world_analogy="Like looking up a contact in an empty address card instead of dialing the known office directory.",
        tags=["java", "runtime", "npe", "null-pointer", "yoda-condition", "intermediate"],
    ),

    "java-sensor-array-bounds": ChallengeTemplate(
        id="java-sensor-array-bounds",
        title="The Case of the Overextended Sensor",
        language=SupportedLanguage.JAVA,
        difficulty="intermediate",
        category="ArrayIndexOutOfBoundsException",
        scenario=(
            "An industrial telemetry reader crashes with an ArrayIndexOutOfBoundsException "
            "at the end of its measurement scanning loop."
        ),
        buggy_code=(
            "public class SensorReader {\n"
            "    public static int getMaximum(int[] readings) {\n"
            "        int max = readings[0];\n"
            "        for (int i = 0; i <= readings.length; i++) {\n"
            "            if (readings[i] > max) {\n"
            "                max = readings[i];\n"
            "            }\n"
            "        }\n"
            "        return max;\n"
            "    }\n"
            "}"
        ),
        expected_behavior="Iterate through all readings without indexing past readings.length - 1.",
        hints=[
            "Java arrays are 0-indexed. An array of length N has valid elements from index 0 up to N - 1.",
            "Look at the condition 'i <= readings.length'. Change '<=' to '<' so i stops before reaching length.",
        ],
        canonical_solutions=[
            (
                "public class SensorReader {\n"
                "    public static int getMaximum(int[] readings) {\n"
                "        int max = readings[0];\n"
                "        for (int i = 0; i < readings.length; i++) {\n"
                "            if (readings[i] > max) {\n"
                "                max = readings[i];\n"
                "            }\n"
                "        }\n"
                "        return max;\n"
                "    }\n"
                "}"
            ),
        ],
        bug_explanation="The loop condition i <= readings.length causes iteration to evaluate readings[readings.length], which is out of bounds.",
        fix_rationale="Using i < readings.length restricts array index access to the legal range [0, readings.length - 1].",
        real_world_analogy="Like finishing a 10-chapter book and turning the page expecting chapter 11.",
        tags=["java", "arrays", "out-of-bounds", "loops", "intermediate"],
    ),

    "java-passcode-string-equality": ChallengeTemplate(
        id="java-passcode-string-equality",
        title="The Case of the Duplicate Passcode",
        language=SupportedLanguage.JAVA,
        difficulty="intermediate",
        category="Reference vs Value Equality",
        scenario=(
            "A vault keypad security system rejects valid matching passcodes entered from remote terminals "
            "because it compares string memory addresses instead of character contents."
        ),
        buggy_code=(
            "public class PasscodeVerifier {\n"
            "    public static boolean verify(String enteredCode, String storedCode) {\n"
            "        return enteredCode == storedCode;\n"
            "    }\n"
            "}"
        ),
        expected_behavior="Return true when enteredCode and storedCode contain the exact same characters.",
        hints=[
            "In Java, the '==' operator on objects compares references (memory addresses), not character values.",
            "Use .equals() to compare textual contents: enteredCode != null && enteredCode.equals(storedCode).",
        ],
        canonical_solutions=[
            (
                "public class PasscodeVerifier {\n"
                "    public static boolean verify(String enteredCode, String storedCode) {\n"
                "        return enteredCode != null && enteredCode.equals(storedCode);\n"
                "    }\n"
                "}"
            ),
            (
                "public class PasscodeVerifier {\n"
                "    public static boolean verify(String enteredCode, String storedCode) {\n"
                "        return enteredCode.equals(storedCode);\n"
                "    }\n"
                "}"
            ),
            (
                "public class PasscodeVerifier {\n"
                "    public static boolean verify(String enteredCode, String storedCode) {\n"
                "        return java.util.Objects.equals(enteredCode, storedCode);\n"
                "    }\n"
                "}"
            ),
        ],
        bug_explanation="The == operator tests for reference equality in memory, failing when comparing separate String instances with identical text.",
        fix_rationale="Calling .equals() compares the actual character sequences of the two strings.",
        real_world_analogy="Like checking if two people have matching house keys versus checking if they are holding the exact same physical key.",
        tags=["java", "strings", "equality", "references", "intermediate"],
    ),

    "java-score-integer-division": ChallengeTemplate(
        id="java-score-integer-division",
        title="The Case of the Truncated Average",
        language=SupportedLanguage.JAVA,
        difficulty="intermediate",
        category="Integer Division Truncation",
        scenario=(
            "A school gradebook calculation computes student exam averages, but silently discards decimal fractions "
            "because the division uses integer operands."
        ),
        buggy_code=(
            "public class GradeCalculator {\n"
            "    public static double computeAverage(int score1, int score2, int score3) {\n"
            "        return (score1 + score2 + score3) / 3;\n"
            "    }\n"
            "}"
        ),
        expected_behavior="Compute and return the exact double-precision average of the three scores.",
        hints=[
            "In Java, dividing an int by an int performs integer division, truncating the fractional portion before returning.",
            "Divide by '3.0' (a double literal) or cast the numerator to '(double)' to promote the operation to double precision.",
        ],
        canonical_solutions=[
            (
                "public class GradeCalculator {\n"
                "    public static double computeAverage(int score1, int score2, int score3) {\n"
                "        return (score1 + score2 + score3) / 3.0;\n"
                "    }\n"
                "}"
            ),
            (
                "public class GradeCalculator {\n"
                "    public static double computeAverage(int score1, int score2, int score3) {\n"
                "        return (double) (score1 + score2 + score3) / 3;\n"
                "    }\n"
                "}"
            ),
            (
                "public class GradeCalculator {\n"
                "    public static double computeAverage(int score1, int score2, int score3) {\n"
                "        return ((double) (score1 + score2 + score3)) / 3;\n"
                "    }\n"
                "}"
            ),
        ],
        bug_explanation="Dividing integers performs integer division, dropping the remainder before casting to double.",
        fix_rationale="Dividing by 3.0 promotes the division to double precision, preserving the fractional score.",
        real_world_analogy="Like splitting $7 between two people and throwing away the remaining 50 cents instead of splitting it.",
        tags=["java", "arithmetic", "division", "truncation", "intermediate"],
    ),

    "java-deposit-shadowed-field": ChallengeTemplate(
        id="java-deposit-shadowed-field",
        title="The Case of the Shadowed Deposit",
        language=SupportedLanguage.JAVA,
        difficulty="advanced",
        category="Variable Shadowing",
        scenario=(
            "A banking ledger initializes customer accounts with an opening balance, "
            "but accounts remain at $0.0 because the constructor assigns the parameter to itself."
        ),
        buggy_code=(
            "public class BankAccount {\n"
            "    private double balance;\n"
            "\n"
            "    public BankAccount(double balance) {\n"
            "        balance = balance;\n"
            "    }\n"
            "\n"
            "    public double getBalance() {\n"
            "        return balance;\n"
            "    }\n"
            "}"
        ),
        expected_behavior="Initialize the instance field this.balance with the parameter value.",
        hints=[
            "The constructor parameter 'balance' shadows the class instance variable 'balance'.",
            "Use 'this.balance = balance;' to explicitly assign to the class instance variable.",
        ],
        canonical_solutions=[
            (
                "public class BankAccount {\n"
                "    private double balance;\n"
                "\n"
                "    public BankAccount(double balance) {\n"
                "        this.balance = balance;\n"
                "    }\n"
                "\n"
                "    public double getBalance() {\n"
                "        return balance;\n"
                "    }\n"
                "}"
            ),
        ],
        bug_explanation="The parameter name shadows the instance variable, causing 'balance = balance;' to reassign the parameter without updating the field.",
        fix_rationale="Prefixing with 'this.' explicitly resolves to the class instance variable.",
        real_world_analogy="Like addressing an envelope to your own desk instead of sending it down to the bank vault.",
        tags=["java", "oop", "shadowing", "this-keyword", "advanced"],
    ),

    "java-recursion-missing-base-case": ChallengeTemplate(
        id="java-recursion-missing-base-case",
        title="The Case of the Endless Loop",
        language=SupportedLanguage.JAVA,
        difficulty="advanced",
        category="Infinite Recursion",
        scenario=(
            "A mathematical engine crashes with a StackOverflowError because a recursive factorial method "
            "never reaches a stopping point."
        ),
        buggy_code=(
            "public class MathEngine {\n"
            "    public static long factorial(int n) {\n"
            "        return n * factorial(n - 1);\n"
            "    }\n"
            "}"
        ),
        expected_behavior="Return 1 when n <= 1 to terminate recursion cleanly, computing factorial of positive integers.",
        hints=[
            "Recursive methods must define a base case condition that returns without invoking itself again.",
            "Add a base case: if (n <= 1) { return 1; } before the recursive call.",
        ],
        canonical_solutions=[
            (
                "public class MathEngine {\n"
                "    public static long factorial(int n) {\n"
                "        if (n <= 1) {\n"
                "            return 1;\n"
                "        }\n"
                "        return n * factorial(n - 1);\n"
                "    }\n"
                "}"
            ),
            (
                "public class MathEngine {\n"
                "    public static long factorial(int n) {\n"
                "        if (n <= 1) return 1;\n"
                "        return n * factorial(n - 1);\n"
                "    }\n"
                "}"
            ),
            (
                "public class MathEngine {\n"
                "    public static long factorial(int n) {\n"
                "        return (n <= 1) ? 1 : n * factorial(n - 1);\n"
                "    }\n"
                "}"
            ),
        ],
        bug_explanation="The recursive function has no base case condition, recursing infinitely until stack frames exhaust memory.",
        fix_rationale="Adding 'if (n <= 1) return 1;' terminates recursion, allowing previous stack frames to resolve.",
        real_world_analogy="Like opening Russian nesting dolls that continue forever without a solid center doll.",
        tags=["java", "recursion", "stackoverflow", "advanced"],
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


def get_challenge_solution(challenge_id: str) -> Optional[ChallengeSolutionResponse]:
    """Retrieve canonical solution and pedagogical rationale for a mystery."""
    template = get_challenge(challenge_id)
    if not template:
        return None
    return template.to_solution()


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
