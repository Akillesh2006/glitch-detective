"""Tests for the health check and root endpoints."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check_success():
    """GET /api/health should return 200 with status ok and supported languages."""
    response = client.get("/api/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "ok"
    assert data["app_name"] == "Glitch Detective API"
    assert data["version"] == "0.1.0"
    assert "python" in data["supported_languages"]
    assert "java" in data["supported_languages"]
    assert "tagline" in data


def test_root_endpoint_success():
    """GET / should return 200 with service welcome information."""
    response = client.get("/")
    assert response.status_code == 200

    data = response.json()
    assert data["service"] == "Glitch Detective API"
    assert data["status"] == "online"
    assert "docs_url" in data
    assert "health_check" in data
    assert "analyze_endpoint" in data
