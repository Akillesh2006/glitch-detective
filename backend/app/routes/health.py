"""Health check endpoint for Glitch Detective."""

from fastapi import APIRouter
from app.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse, summary="System Health Check")
def get_health() -> HealthResponse:
    """Return system status, version, tagline, and supported languages."""
    return HealthResponse()
