import pytest
from fastapi.testclient import TestClient
from uuid import uuid4
from unittest.mock import MagicMock
from datetime import datetime

from app.main import app
from app.db.database import get_db
from app.api.dependencies import get_current_profile
from app.db.models import Profile, Depot, Vehicle, Order

client = TestClient(app)

MOCK_OPERATOR_A_ID = uuid4()
MOCK_OPERATOR_B_ID = uuid4()

MOCK_PROFILE_ADMIN = Profile(id=uuid4(), role='ADMIN', operator_id=None)
MOCK_PROFILE_OP_A = Profile(id=uuid4(), role='OPERATOR', operator_id=MOCK_OPERATOR_A_ID)
MOCK_PROFILE_OP_B = Profile(id=uuid4(), role='OPERATOR', operator_id=MOCK_OPERATOR_B_ID)

@pytest.fixture
def mock_db():
    db = MagicMock()
    app.dependency_overrides[get_db] = lambda: db
    yield db
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture
def auth_op_a():
    app.dependency_overrides[get_current_profile] = lambda: MOCK_PROFILE_OP_A
    yield
    app.dependency_overrides.pop(get_current_profile, None)

@pytest.fixture
def auth_op_b():
    app.dependency_overrides[get_current_profile] = lambda: MOCK_PROFILE_OP_B
    yield
    app.dependency_overrides.pop(get_current_profile, None)

@pytest.fixture
def auth_admin():
    app.dependency_overrides[get_current_profile] = lambda: MOCK_PROFILE_ADMIN
    yield
    app.dependency_overrides.pop(get_current_profile, None)

def test_unauthenticated_request_rejected(mock_db):
    # Will fail at HTTPBearer due to missing token
    response = client.get("/api/v1/depots")
    assert response.status_code == 401

def test_operator_id_spoofing(mock_db, auth_op_a):
    # Operator A tries to create a vehicle with Operator B's ID in the payload (if it existed)
    # Our schema doesn't even accept operator_id in create, it strictly uses the Profile's operator_id.
    payload = {
        "reference_number": "VEH-SPOOF",
        "vehicle_type": "TRUCK",
        "capacity_kg": 5000,
        "scenario": "LIVE",
        "operator_id": str(MOCK_OPERATOR_B_ID) # Attempt spoofing
    }
    
    # We mock db.add to inspect what was added
    def mock_add(obj):
        assert obj.operator_id == MOCK_OPERATOR_A_ID
        obj.id = uuid4()
        obj.created_at = datetime.now()
        obj.updated_at = datetime.now()
        
    mock_db.add.side_effect = mock_add
    
    response = client.post("/api/v1/vehicles/", json=payload)
    assert response.status_code == 201
    assert response.json()["operator_id"] == str(MOCK_OPERATOR_A_ID)

def test_operator_cannot_get_other_operator_vehicle(mock_db, auth_op_a):
    mock_vehicle = Vehicle(id=uuid4(), operator_id=MOCK_OPERATOR_B_ID, reference_number="VEH-B", vehicle_type="VAN", capacity_kg=1000)
    mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_vehicle
    
    response = client.get(f"/api/v1/vehicles/{mock_vehicle.id}")
    assert response.status_code == 403

def test_operator_cannot_patch_other_operator_order(mock_db, auth_op_a):
    mock_order = Order(id=uuid4(), operator_id=MOCK_OPERATOR_B_ID, reference_number="ORD-B", weight_kg=100)
    mock_db.query().filter().first.return_value = mock_order
    
    payload = {"weight_kg": 200}
    response = client.patch(f"/api/v1/orders/{mock_order.id}", json=payload)
    assert response.status_code == 403

def test_operator_cannot_delete_other_operator_depot(mock_db, auth_op_a):
    mock_depot = Depot(id=uuid4(), operator_id=MOCK_OPERATOR_B_ID, name="Depot B")
    mock_db.query().filter().first.return_value = mock_depot
    
    response = client.delete(f"/api/v1/depots/{mock_depot.id}")
    assert response.status_code == 403

def test_admin_can_get_any_operator_vehicle(mock_db, auth_admin):
    mock_vehicle = Vehicle(
        id=uuid4(), 
        operator_id=MOCK_OPERATOR_B_ID, 
        reference_number="VEH-B", 
        vehicle_type="VAN", 
        capacity_kg=1000,
        status="AVAILABLE",
        scenario="DEMO",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_vehicle
    
    response = client.get(f"/api/v1/vehicles/{mock_vehicle.id}")
    assert response.status_code == 200
    assert response.json()["reference_number"] == "VEH-B"

def test_validation_capacity_kg(mock_db, auth_op_a):
    payload = {
        "reference_number": "VEH-BAD",
        "vehicle_type": "TRUCK",
        "capacity_kg": 0 # Invalid
    }
    response = client.post("/api/v1/vehicles/", json=payload)
    assert response.status_code == 422

def test_validation_weight_kg(mock_db, auth_op_a):
    payload = {
        "reference_number": "ORD-BAD",
        "destination_latitude": 22.0,
        "destination_longitude": 75.0,
        "weight_kg": -5 # Invalid
    }
    response = client.post("/api/v1/orders/", json=payload)
    assert response.status_code == 422

def test_validation_latitude(mock_db, auth_op_a):
    payload = {
        "name": "Depot Bad",
        "latitude": 91.0, # Invalid
        "longitude": 75.0
    }
    response = client.post("/api/v1/depots/", json=payload)
    assert response.status_code == 422
