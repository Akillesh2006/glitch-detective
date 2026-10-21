"""Vercel Serverless Function entrypoint for Glitch Detective FastAPI backend."""

import os
import sys

# Ensure backend directory is in sys.path so app modules are resolvable
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app  # noqa: E402

# Vercel's Python runtime natively exports this ASGI application
__all__ = ["app"]
