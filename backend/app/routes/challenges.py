"""FastAPI route handlers for Detective Mode debugging challenges."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.schemas import (
    ChallengeDetail,
    ChallengeSolutionResponse,
    ChallengeSummary,
    SupportedLanguage,
    VerifyChallengeRequest,
    VerifyChallengeResponse,
)
from app.engine.challenge_catalog import (
    get_challenge_detail,
    get_challenge_solution,
    get_next_challenge,
    list_challenges,
)
from app.engine.challenge_verifier import verify_solution

router = APIRouter(tags=["challenges"])


@router.get(
    "/challenges",
    response_model=List[ChallengeSummary],
    summary="List Available Debugging Challenges",
)
def get_challenges_list(
    language: Optional[SupportedLanguage] = Query(None, description="Filter by language (python or java)"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty (e.g. beginner)"),
) -> List[ChallengeSummary]:
    """Retrieve catalog list of debugging challenges (summary view, without solutions)."""
    return list_challenges(language=language, difficulty=difficulty)


@router.get(
    "/challenges/next",
    response_model=ChallengeDetail,
    summary="Get Next Debugging Challenge",
)
def get_next_mystery(
    language: Optional[SupportedLanguage] = Query(None, description="Target language (python or java)"),
    difficulty: Optional[str] = Query(None, description="Difficulty tier (e.g. beginner)"),
    seed: Optional[int] = Query(None, description="Deterministic seed for challenge rotation"),
) -> ChallengeDetail:
    """Get the next challenge meeting specified criteria. Conceals future hints and solutions."""
    challenge = get_next_challenge(language=language, difficulty=difficulty, seed=seed)
    if not challenge:
        raise HTTPException(
            status_code=404,
            detail="No challenges match the requested criteria.",
        )
    return challenge


@router.get(
    "/challenges/{challenge_id}",
    response_model=ChallengeDetail,
    summary="Get Challenge By Identifier",
)
def get_challenge_by_id(
    challenge_id: str,
    hint_level: int = Query(0, ge=0, description="Highest hint level unlocked (0 for none)"),
) -> ChallengeDetail:
    """Retrieve details for a specific mystery case. Conceals solutions and unrequested hints."""
    challenge = get_challenge_detail(challenge_id=challenge_id, hint_level=hint_level)
    if not challenge:
        raise HTTPException(
            status_code=404,
            detail=f"Challenge '{challenge_id}' not found.",
        )
    return challenge


@router.get(
    "/challenges/{challenge_id}/solution",
    response_model=ChallengeSolutionResponse,
    summary="Reveal Canonical Challenge Solution",
)
def reveal_challenge_solution(
    challenge_id: str,
) -> ChallengeSolutionResponse:
    """Reveal the canonical solution, bug explanation, and rationale for a mystery.
    
    Pedagogical design note: The client UI gates this behind revealing all hints.
    This endpoint explicitly provides the intended solution upon request.
    """
    solution = get_challenge_solution(challenge_id)
    if not solution:
        raise HTTPException(
            status_code=404,
            detail=f"Challenge '{challenge_id}' not found.",
        )
    return solution



@router.post(
    "/challenges/{challenge_id}/verify",
    response_model=VerifyChallengeResponse,
    summary="Verify Challenge Solution (Path ID)",
)
def verify_challenge_by_path(
    challenge_id: str,
    payload: VerifyChallengeRequest,
) -> VerifyChallengeResponse:
    """Verify a learner's submitted solution against the specified challenge.
    
    Zero code execution: verifies code using static AST analysis and token sequence checks.
    """
    return verify_solution(challenge_id=challenge_id, submitted_code=payload.code)


@router.post(
    "/challenges/verify",
    response_model=VerifyChallengeResponse,
    summary="Verify Challenge Solution (Body ID)",
)
def verify_challenge_by_body(
    payload: VerifyChallengeRequest,
) -> VerifyChallengeResponse:
    """Verify a solution when challenge_id is provided in the request payload."""
    if not payload.challenge_id:
        raise HTTPException(
            status_code=422,
            detail="Field 'challenge_id' is required when submitting to /challenges/verify.",
        )
    return verify_solution(challenge_id=payload.challenge_id, submitted_code=payload.code)
