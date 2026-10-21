"""Glitch Detective Real Debugging Engine."""

from app.engine.python_analyzer import analyze_python_snippet
from app.engine.java_analyzer import analyze_java_snippet

__all__ = ["analyze_python_snippet", "analyze_java_snippet"]
