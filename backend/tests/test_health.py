from fastapi.testclient import TestClient
from app.main import app
from app.db.database import get_db

client = TestClient(app)

import pytest

@pytest.fixture(autouse=True)
def override_db():
    def override_get_db():
        class MockDB:
            def execute(self, query):
                pass
        yield MockDB()
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)

def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "database" in data
