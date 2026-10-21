"""Main FastAPI entry point for Glitch Detective."""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.health import router as health_router
from app.routes.analyze import router as analyze_router

app = FastAPI(
    title="Glitch Detective API",
    description="Backend API for Glitch Detective - A beginner-friendly Java and Python debugging tutor.",
    version="0.1.0",
)

# Configure CORS for local development frontend
cors_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
allowed_origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(health_router)
app.include_router(analyze_router)


@app.get("/", tags=["root"])
def root():
    """Root endpoint welcoming developers to the Glitch Detective API."""
    return {
        "service": "Glitch Detective API",
        "tagline": "Understand the bug. Fix the code. Learn the concept.",
        "status": "online",
        "milestone": "1.0 - Foundation",
        "docs_url": "/docs",
        "health_check": "/api/health",
        "analyze_endpoint": "/api/analyze",
    }
