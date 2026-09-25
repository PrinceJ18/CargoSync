import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app
from app.api.dependencies import require_admin, get_current_profile

def mock_profile():
    class MockProfile:
        role = "ADMIN"
        operator_id = None
    return MockProfile()

app.dependency_overrides[require_admin] = mock_profile
app.dependency_overrides[get_current_profile] = mock_profile

client = TestClient(app)
print("Triggering DEMO optimization...")
resp = client.post("/api/v1/optimization/runs", json={"scenario_id": "DEMO"})
print("Status:", resp.status_code)
print("Body:", resp.text[:500])

print("Triggering NETWORK optimization...")
resp = client.post("/api/v1/optimization/runs", json={"scenario_id": "NETWORK"})
print("Status:", resp.status_code)
print("Body:", resp.text[:500])
