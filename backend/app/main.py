"""Main FastAPI entry point for Glitch Detective."""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.health import router as health_router
from app.routes.analyze import router as analyze_router
from app.routes.challenges import router as challenges_router

app = FastAPI(
    title="Glitch Detective API",
    description="Backend API for Glitch Detective - A beginner-friendly Java and Python debugging tutor.",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Configure CORS for local development frontend and Vercel deployments
cors_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
allowed_origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()]

# Match all Vercel preview and production deployments (*.vercel.app)
cors_regex = os.getenv("CORS_ORIGIN_REGEX", r"^https://.*\.vercel\.app$")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=cors_regex if cors_regex else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules under /api (primary public API surface)
app.include_router(health_router, prefix="/api")
app.include_router(analyze_router, prefix="/api")
app.include_router(challenges_router, prefix="/api")

# Also register route aliases without /api prefix so requests succeed whether
# a serverless gateway preserves or strips the /api prefix
app.include_router(health_router, prefix="", include_in_schema=False)
app.include_router(analyze_router, prefix="", include_in_schema=False)
app.include_router(challenges_router, prefix="", include_in_schema=False)


@app.get("/docs", include_in_schema=False)
def docs_redirect():
    """Redirect local /docs requests to /api/docs."""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/api/docs")


@app.get("/api", tags=["root"], include_in_schema=False)
@app.get("/api/", tags=["root"], include_in_schema=False)
@app.get("/", tags=["root"])
def root():
    """Root endpoint welcoming developers to the Glitch Detective API."""
    return {
        "service": "Glitch Detective API",
        "tagline": "Understand the bug. Fix the code. Learn the concept.",
        "status": "online",
        "milestone": "1.0 - Foundation",
        "docs_url": "/api/docs",
        "health_check": "/api/health",
        "analyze_endpoint": "/api/analyze",
        "challenges_endpoint": "/api/challenges",
    }
