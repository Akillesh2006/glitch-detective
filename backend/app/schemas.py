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
