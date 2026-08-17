from fastapi.testclient import TestClient


def test_health():
    from app.main import app

    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code in (200, 503)
    assert "status" in response.json()
