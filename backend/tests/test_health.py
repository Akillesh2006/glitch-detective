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


def test_cors_preflight_localhost_and_vercel():
    """CORS preflight should authorize local development and Vercel app domains."""
    # Test localhost origin
    local_res = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert local_res.status_code == 200
    assert local_res.headers.get("access-control-allow-origin") == "http://localhost:5173"

    # Test Vercel production domain
    vercel_res = client.options(
        "/api/health",
        headers={
            "Origin": "https://glitch-detective.vercel.app",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert vercel_res.status_code == 200
    assert vercel_res.headers.get("access-control-allow-origin") == "https://glitch-detective.vercel.app"

    # Test Vercel preview domain
    preview_res = client.options(
        "/api/health",
        headers={
            "Origin": "https://glitch-detective-git-main-akillesh2006.vercel.app",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert preview_res.status_code == 200
    assert preview_res.headers.get("access-control-allow-origin") == "https://glitch-detective-git-main-akillesh2006.vercel.app"

    # Test unauthorized arbitrary external origin (must NOT be allowed)
    unauthorized_res = client.options(
        "/api/health",
        headers={
            "Origin": "https://unauthorized-arbitrary-domain.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert unauthorized_res.headers.get("access-control-allow-origin") is None


def test_vercel_serverless_entrypoint_import():
    """Verify that api/index.py cleanly imports and exposes the FastAPI application."""
    import sys
    import os
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    api_dir = os.path.join(repo_root, "api")
    if api_dir not in sys.path:
        sys.path.insert(0, api_dir)

    import index as vercel_api
    assert hasattr(vercel_api, "app")
    serverless_client = TestClient(vercel_api.app)
    res = serverless_client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    res_api = serverless_client.get("/api")
    assert res_api.status_code == 200
    assert res_api.json()["service"] == "Glitch Detective API"

    res_docs = serverless_client.get("/api/docs")
    assert res_docs.status_code == 200

    # Also verify route aliases without /api prefix
    res_direct_health = serverless_client.get("/health")
    assert res_direct_health.status_code == 200
    assert res_direct_health.json()["status"] == "ok"

    res_direct_analyze = serverless_client.post(
        "/analyze",
        json={"language": "python", "code": 'print("Hello"'},
    )
    assert res_direct_analyze.status_code == 200
    assert res_direct_analyze.json()["status"] == "syntax_error"


