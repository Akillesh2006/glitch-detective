"""Deterministic explanation and real-world analogy registry for Glitch Detective.

Provides beginner-friendly, concise real-world analogies and actionable summaries
for supported syntax, runtime, and structural error categories without duplicating
diagnostic logic.
"""

import re
from typing import Dict, NamedTuple, Optional, Tuple


class ExplanationEntry(NamedTuple):
    analogy: Optional[str]
    actionable_summary: Optional[str]


# Deterministic registry mapping known error categories to pedagogical analogies and actionable summaries.
EXPLANATION_REGISTRY: Dict[str, ExplanationEntry] = {
    # Delimiters
    "SyntaxError: Unclosed Delimiter": ExplanationEntry(
        analogy="Like opening quotation marks in a sentence but never closing them—the reader cannot tell where your quote ends and the rest of the text begins.",
        actionable_summary="Add the matching closing delimiter to complete the expression.",
    ),
    "JavaSyntaxError: Unclosed Delimiter": ExplanationEntry(
        analogy="Like opening quotation marks in a sentence but never closing them—the reader cannot tell where your quote ends and the rest of the text begins.",
        actionable_summary="Add the matching closing delimiter to complete the expression.",
    ),
    "SyntaxError: Unmatched Delimiter": ExplanationEntry(
        analogy="Like locking a door with a padlock but trying to secure it with a belt buckle—the two sides were designed for different shapes and do not match.",
        actionable_summary="Change the closing character to match the type of bracket or parenthesis opened.",
    ),
    "JavaSyntaxError: Mismatched Delimiter": ExplanationEntry(
        analogy="Like locking a door with a padlock but trying to secure it with a belt buckle—the two sides were designed for different shapes and do not match.",
        actionable_summary="Change the closing character to match the type of bracket or parenthesis opened.",
    ),

    # Colons & Indentation
    "SyntaxError: Missing Colon": ExplanationEntry(
        analogy="Like a chapter title without punctuation—the reader cannot tell whether it is a heading or the first sentence of the chapter.",
        actionable_summary="Add a colon ':' at the end of the header line before indenting the block beneath it.",
    ),
    "IndentationError": ExplanationEntry(
        analogy="Like an item shifted out of place in a numbered outline—it is unclear which section or topic it belongs to.",
        actionable_summary="Align the code indentation consistently using 4 spaces per nesting level.",
    ),

    # Semicolons & Java Structure
    "JavaSyntaxError: Missing Semicolon": ExplanationEntry(
        analogy="Like omitting a period between two English sentences—two separate instructions blur together and confuse the reader.",
        actionable_summary="Add a semicolon ';' at the end of the statement line.",
    ),
    "JavaStructureError: Missing Class": ExplanationEntry(
        analogy="Like shipping an engine part without a shipping container or address label—Java requires every method to reside inside a named class container.",
        actionable_summary="Wrap standalone statements inside a class definition and a main method.",
    ),
    "JavaSyntaxError: Capitalization": ExplanationEntry(
        analogy="Like sending a letter to 'paris' in a postal sorting facility that only recognizes capitalized proper nouns like 'Paris'.",
        actionable_summary="Capitalize standard Java class names like 'System' and 'String'.",
    ),
    "JavaLogicWarning: Reference Equality": ExplanationEntry(
        analogy="Like checking if two cars are parked in the exact same parking spot instead of checking if they are the same make and model.",
        actionable_summary="Use .equals() to compare string content instead of '==' which only checks memory location.",
    ),
    "JavaTypeError: Incompatible Types": ExplanationEntry(
        analogy="Like trying to plug a round two-prong plug into a three-prong triangular socket—the shapes are incompatible without an adapter.",
        actionable_summary="Convert the value to the expected type or declare the variable with a matching type.",
    ),

    # Strings & Assignments
    "SyntaxError: Unterminated String": ExplanationEntry(
        analogy="Like holding a megaphone button down and never releasing it—the computer considers everything that follows part of the same announcement.",
        actionable_summary="Add the matching closing quote (' or \") before the end of the line.",
    ),
    "SyntaxError: Invalid Assignment": ExplanationEntry(
        analogy="Like setting a thermostat to 72 while asking what temperature the room currently is—setting a value is different from checking it.",
        actionable_summary="Replace '=' (assignment) with '==' (equality comparison) inside the condition.",
    ),

    # Runtime Errors
    "NullPointerException": ExplanationEntry(
        analogy="Like opening an empty envelope to read a letter that was never put inside—you cannot read words from something that does not exist.",
        actionable_summary="Verify that the variable is initialized and not null before calling methods on it.",
    ),
    "ZeroDivisionError": ExplanationEntry(
        analogy="Like trying to divide 10 apples evenly among zero people—it is mathematically undefined and cannot produce a result.",
        actionable_summary="Add a guard check to ensure the denominator or collection length is greater than zero before dividing.",
    ),
    "IndexError": ExplanationEntry(
        analogy="Like pressing button 10 in an elevator inside a 3-story building—you are requesting a floor that does not exist.",
        actionable_summary="Ensure the index is within the valid range (between 0 and length - 1).",
    ),
    "KeyError": ExplanationEntry(
        analogy="Like looking up a contact name in an address book where no entry exists for that person.",
        actionable_summary="Use dict.get(key, default) or check 'if key in dict:' before accessing the value.",
    ),
    "TypeError": ExplanationEntry(
        analogy="Like trying to plug a round two-prong plug into a three-prong triangular socket—the shapes are incompatible without an adapter.",
        actionable_summary="Convert the value to the expected type or ensure the operation supports both types.",
    ),
    "ValueError": ExplanationEntry(
        analogy="Like handing a ticket agent a valid ticket for a train that left yesterday—the ticket is genuine, but its value is unusable here.",
        actionable_summary="Check that the input text contains characters valid for the target conversion.",
    ),
    "RuntimeError": ExplanationEntry(
        analogy="Like an appliance that turns on properly but stops when it encounters unexpected water pressure—the hardware is fine, but the operating condition failed.",
        actionable_summary="Add exception handling or check input state before calling this operation.",
    ),

    # General Syntax Fallback
    "SyntaxError": ExplanationEntry(
        analogy="Like a sentence with words in an order that violates grammar rules—the listener cannot determine what action was meant.",
        actionable_summary="Check the indicated line for misplaced symbols, misspelled keywords, or missing punctuation.",
    ),
}


def get_explanation_details(category: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """Lookup real-world analogy and actionable summary for an error category.
    
    Returns (real_world_analogy, actionable_summary).
    
    Guarantees:
    - Known supported categories receive direct, beginner-friendly analogies and actionable summaries.
    - Ambiguous, valid, or unknown categories NEVER receive misleading analogies (returns None).
    """
    if not category:
        return None, None

    clean_cat = category.strip()

    # Rule: Never invent misleading analogies for ambiguous or valid states
    cat_lower = clean_cat.lower()
    is_valid = bool(re.search(r"\bvalid\b", cat_lower)) or clean_cat in ("None (Valid Code)", "None (Valid Structure)")
    is_ambiguous = bool(re.search(r"\bambiguous\b", cat_lower)) or "unsupported" in cat_lower or clean_cat == "JavaAnalysis: Ambiguous Snippet"

    if is_valid or is_ambiguous:
        actionable = "Your code parsed cleanly with no syntax errors." if is_valid else None
        return None, actionable

    # Exact registry lookup
    if clean_cat in EXPLANATION_REGISTRY:
        entry = EXPLANATION_REGISTRY[clean_cat]
        return entry.analogy, entry.actionable_summary

    # Prefix / keyword matching fallback for known error patterns
    if "unclosed" in cat_lower or "missing delimiter" in cat_lower:
        entry = EXPLANATION_REGISTRY["SyntaxError: Unclosed Delimiter"]
        return entry.analogy, entry.actionable_summary
    if "colon" in cat_lower:
        entry = EXPLANATION_REGISTRY["SyntaxError: Missing Colon"]
        return entry.analogy, entry.actionable_summary
    if "indent" in cat_lower:
        entry = EXPLANATION_REGISTRY["IndentationError"]
        return entry.analogy, entry.actionable_summary
    if "semicolon" in cat_lower:
        entry = EXPLANATION_REGISTRY["JavaSyntaxError: Missing Semicolon"]
        return entry.analogy, entry.actionable_summary
    if "nullpointer" in cat_lower:
        entry = EXPLANATION_REGISTRY["NullPointerException"]
        return entry.analogy, entry.actionable_summary
    if "zerodivision" in cat_lower:
        entry = EXPLANATION_REGISTRY["ZeroDivisionError"]
        return entry.analogy, entry.actionable_summary
    if "indexerror" in cat_lower:
        entry = EXPLANATION_REGISTRY["IndexError"]
        return entry.analogy, entry.actionable_summary
    if "keyerror" in cat_lower:
        entry = EXPLANATION_REGISTRY["KeyError"]
        return entry.analogy, entry.actionable_summary
    if "typeerror" in cat_lower:
        entry = EXPLANATION_REGISTRY["TypeError"]
        return entry.analogy, entry.actionable_summary
    if "valueerror" in cat_lower:
        entry = EXPLANATION_REGISTRY["ValueError"]
        return entry.analogy, entry.actionable_summary

    # Truly unknown or unclassified categories must not receive a misleading analogy
    return None, None
