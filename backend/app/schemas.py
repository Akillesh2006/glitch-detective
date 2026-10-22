"""Pydantic schemas for request validation and response models."""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class SupportedLanguage(str, Enum):
    """Supported programming languages for Glitch Detective debugging tutor."""
    PYTHON = "python"
    JAVA = "java"

    @classmethod
    def _missing_(cls, value: object):
        if isinstance(value, str):
            for member in cls:
                if member.value.lower() == value.lower():
                    return member
        return None


class AnalyzeRequest(BaseModel):
    """Input payload for code analysis requests."""
    language: SupportedLanguage = Field(
        ...,
        description="Target programming language (supported: python, java)",
        examples=["python", "java"],
    )
    code: str = Field(
        ...,
        min_length=1,
        max_length=20000,
        description="Source code snippet to analyze (up to 20,000 characters)",
        examples=["def add(a, b):\n    return a + b\n\nprint(add(5, '10'))"],
    )
    error_message: Optional[str] = Field(
        default=None,
        max_length=10000,
        description="Optional error message or stack trace (up to 10,000 characters)",
        examples=["TypeError: unsupported operand type(s) for +: 'int' and 'str'"],
    )

    @field_validator("code")
    @classmethod
    def validate_code_not_blank(cls, v: str) -> str:
        if "\x00" in v:
            raise ValueError("The code field cannot contain null bytes.")
        if not v.strip():
            raise ValueError("The code field cannot be empty or contain only whitespace.")
        return v

    @field_validator("error_message")
    @classmethod
    def validate_error_message(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and "\x00" in v:
            raise ValueError("The error_message field cannot contain null bytes.")
        return v


class AnalyzeResponse(BaseModel):
    """Analysis result returned by Glitch Detective.
    
    Milestone 2 provides real, deterministic diagnostic reports containing:
    - Root cause analysis
    - Relevant line-level evidence
    - Minimal corrected code
    - Pedagogical fix explanations
    - Safe static expected output
    - Conceptual practice questions
    """
    status: str = Field(
        default="success",
        description="Diagnostic status: 'syntax_error', 'valid', 'runtime_error', 'ambiguous', 'unsupported'",
    )
    is_placeholder: bool = Field(
        default=False,
        description="Flag indicating if this is a placeholder response (False for Milestone 2)",
    )
    language: str = Field(
        ...,
        description="Language of analyzed snippet",
    )
    error_category: Optional[str] = Field(
        default=None,
        description="Category of error (e.g. SyntaxError, IndentationError, JavaSyntaxError)",
    )
    title: Optional[str] = Field(
        default=None,
        description="Short, beginner-friendly title for the diagnostic",
    )
    line_number: Optional[int] = Field(
        default=None,
        description="1-indexed line number where the issue was detected",
    )
    column_offset: Optional[int] = Field(
        default=None,
        description="1-indexed column offset where the issue was detected",
    )
    root_cause: str = Field(
        ...,
        description="Explanation of the underlying cause of the bug",
    )
    relevant_evidence: List[str] = Field(
        ...,
        description="Specific lines, variables, or error clues identifying the problem",
    )
    suggested_fix: str = Field(
        ...,
        description="Minimal corrected code pattern to resolve the issue",
    )
    fix_explanation: Optional[str] = Field(
        default=None,
        description="Explanation of why the minimal fix works",
    )
    expected_output: Optional[str] = Field(
        default=None,
        description="Expected console output when safely inferred without code execution",
    )
    hint: Optional[str] = Field(
        default=None,
        description="Contextual hint or guiding question for Step 2 of guided workflow",
    )
    practice_question: str = Field(
        ...,
        description="Conceptual follow-up question to solidify learning",
    )
    real_world_analogy: Optional[str] = Field(
        default=None,
        description="Concise real-world analogy explaining why the concept matters",
    )
    actionable_summary: Optional[str] = Field(
        default=None,
        description="One-sentence actionable summary of how to correct the issue",
    )
    confidence: str = Field(
        default="high",
        description="Diagnostic confidence: 'high', 'medium', 'low', 'ambiguous'",
    )
    disclaimer: str = Field(
        default="Parsed statically using deterministic AST/analysis. User code was never executed on the host.",
        description="Notice disclosing static analysis and confirming no execution",
    )
    submitted_code_preview: str = Field(
        ...,
        description="Preview of the first lines of submitted code to confirm reception",
    )
    submitted_error_preview: Optional[str] = Field(
        default=None,
        description="Preview of submitted error message if provided",
    )


class HealthResponse(BaseModel):
    """Response model for system health check endpoint."""
    status: str = Field(default="ok", description="Health check status")
    app_name: str = Field(default="Glitch Detective API", description="Service application name")
    version: str = Field(default="0.1.0", description="API version")
    tagline: str = Field(
        default="Understand the bug. Fix the code. Learn the concept.",
        description="Project tagline",
    )
    supported_languages: List[str] = Field(
        default=["python", "java"],
        description="List of supported programming languages",
    )


# ---------------------------------------------------------------------------
# Phase 2: Detective Mode Challenge Schemas
# ---------------------------------------------------------------------------

class ChallengeDifficulty(str, Enum):
    """Supported difficulty tiers for debugging mysteries."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class ChallengeSummary(BaseModel):
    """Public summary metadata for challenge catalog browsing."""
    id: str = Field(..., description="Unique stable challenge identifier")
    title: str = Field(..., description="Engaging mystery case title")
    language: SupportedLanguage = Field(..., description="Programming language")
    difficulty: str = Field(default="beginner", description="Difficulty tier")
    category: str = Field(..., description="Target defect category")
    scenario: str = Field(..., description="Short real-world scenario briefing")


class ChallengeDetail(BaseModel):
    """Public challenge details for solving. Conceals canonical solutions."""
    id: str = Field(..., description="Unique stable challenge identifier")
    title: str = Field(..., description="Engaging mystery case title")
    language: SupportedLanguage = Field(..., description="Programming language")
    difficulty: str = Field(default="beginner", description="Difficulty tier")
    category: str = Field(..., description="Target defect category")
    scenario: str = Field(..., description="Short real-world scenario briefing")
    buggy_code: str = Field(..., description="Source code containing the defect")
    expected_behavior: str = Field(..., description="Description of intended behavior or output")
    total_hints: int = Field(..., description="Total progressive hints available")
    unlocked_hints: List[str] = Field(default_factory=list, description="List of currently revealed hints")
    hint_level: int = Field(default=0, description="Highest hint level unlocked so far")


class VerifyChallengeRequest(BaseModel):
    """Payload for submitting a candidate solution to a challenge."""
    challenge_id: Optional[str] = Field(
        default=None,
        description="Optional challenge ID if not provided in the route path",
    )
    code: str = Field(
        ...,
        min_length=1,
        max_length=20000,
        description="Learner's proposed correction code",
    )

    @field_validator("code")
    @classmethod
    def validate_code_not_blank(cls, v: str) -> str:
        if "\x00" in v:
            raise ValueError("The code field cannot contain null bytes.")
        if not v.strip():
            raise ValueError("The code field cannot be empty or contain only whitespace.")
        return v


class VerifyChallengeResponse(BaseModel):
    """Result of evaluating a proposed correction against a challenge."""
    challenge_id: str = Field(..., description="Target challenge identifier")
    status: str = Field(..., description="'correct', 'incorrect', or 'ambiguous'")
    passed: bool = Field(..., description="True if the challenge was successfully resolved")
    message: str = Field(..., description="Short outcome banner")
    feedback: str = Field(..., description="Helpful, non-spoiling pedagogical feedback")
    details: Optional[str] = Field(default=None, description="Additional context or syntax clues")


class ChallengeSolutionResponse(BaseModel):
    """Payload for revealing the canonical solution and pedagogical rationale."""
    challenge_id: str = Field(..., description="Target challenge identifier")
    title: str = Field(..., description="Mystery title")
    canonical_solution: str = Field(..., description="Complete intended corrected code")
    bug_explanation: str = Field(..., description="Concise explanation of the original defect")
    fix_rationale: str = Field(..., description="Explanation of why the correction works")
    real_world_analogy: Optional[str] = Field(default=None, description="Optional relatable real-world analogy")


