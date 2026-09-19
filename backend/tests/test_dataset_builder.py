import pytest
from uuid import uuid4
from unittest.mock import MagicMock, patch
from geoalchemy2.elements import WKBElement
from shapely.geometry import Point
from fastapi.testclient import TestClient
import math

from app.main import app
from app.db.models import Order, Depot, Vehicle, Profile
from app.services.routing.dataset_builder import RoutingDatasetBuilder
from app.services.routing.dataset_schemas import RoutingDataset
from app.api.dependencies import get_current_profile, get_db

client = TestClient(app)

def create_mock_wkb(lon, lat):
    # WKBElement expects the raw WKB buffer, which shapely provides.
    return WKBElement(Point(lon, lat).wkb, srid=4326)

@pytest.fixture
def mock_db():
    return MagicMock()

def test_coordinate_extraction(mock_db):
    builder = RoutingDatasetBuilder(mock_db)
    wkb = create_mock_wkb(75.8577, 22.7196) # lon, lat
    lat, lon = builder._extract_coordinates(wkb)
    # 4. Latitude/longitude ordering.
    assert lat == 22.7196
    assert lon == 75.8577

def test_invalid_coordinate_rejection(mock_db):
    builder = RoutingDatasetBuilder(mock_db)
    
    # 5. Invalid coordinate rejection.
    invalid_wkb = create_mock_wkb(181.0, 91.0)
    with pytest.raises(Exception):
        builder._extract_coordinates(invalid_wkb)
        
    nan_wkb = create_mock_wkb(math.nan, math.nan)
    with pytest.raises(Exception):
        builder._extract_coordinates(nan_wkb)

def test_missing_coordinate_handling(mock_db):
    builder = RoutingDatasetBuilder(mock_db)
    # 6. Missing required coordinate handling.
    with pytest.raises(Exception):
        builder._extract_coordinates(None)

def test_builder_valid_dataset_construction(mock_db):
    op_id = uuid4()
    
    depot = Depot(id=uuid4(), operator_id=op_id, name="Test Depot", location=create_mock_wkb(75.8, 22.7), scenario="DEMO")
    vehicle = Vehicle(id=uuid4(), operator_id=op_id, reference_number="V1", vehicle_type="TRUCK", capacity_kg=1000, status="AVAILABLE", scenario="DEMO")
    order = Order(id=uuid4(), operator_id=op_id, reference_number="O1", destination_location=create_mock_wkb(75.81, 22.71), weight_kg=50, status="PENDING", scenario="DEMO")
    
    # Mocking query chain: self.db.query(Model).filter(...).all()
    mock_db.query().filter().all.side_effect = [
        [depot],   # depots
        [vehicle], # vehicles
        [order]    # orders
    ]
    
    builder = RoutingDatasetBuilder(mock_db)
    # 1. Valid DEMO dataset construction.
    dataset = builder.build_dataset("DEMO")
    
    assert dataset.scenario == "DEMO"
    assert len(dataset.depots) == 1
    assert len(dataset.vehicles) == 1
    assert len(dataset.orders) == 1
    
    assert dataset.depots[0].latitude == 22.7
    assert dataset.orders[0].destination_longitude == 75.81

def test_vehicle_capacity_validation(mock_db):
    # 7. Vehicle capacity validation. (<= 0 ignored)
    op_id = uuid4()
    v1 = Vehicle(id=uuid4(), operator_id=op_id, reference_number="V1", vehicle_type="TRUCK", status="AVAILABLE", capacity_kg=0, scenario="DEMO")
    v2 = Vehicle(id=uuid4(), operator_id=op_id, reference_number="V2", vehicle_type="TRUCK", status="AVAILABLE", capacity_kg=-10, scenario="DEMO")
    v3 = Vehicle(id=uuid4(), operator_id=op_id, reference_number="V3", vehicle_type="TRUCK", status="AVAILABLE", capacity_kg=500, scenario="DEMO")
    
    mock_db.query().filter().all.side_effect = [[], [v1, v2, v3], []]
    
    builder = RoutingDatasetBuilder(mock_db)
    dataset = builder.build_dataset("DEMO")
    
    assert len(dataset.vehicles) == 1
    assert dataset.vehicles[0].capacity_kg == 500
    
    assert len(dataset.issues) == 2
    assert dataset.issues[0].record_type == "Vehicle"
    assert dataset.issues[0].record_id == v1.id
    assert dataset.issues[1].record_type == "Vehicle"
    assert dataset.issues[1].record_id == v2.id

def test_missing_and_invalid_coordinate_issues(mock_db):
    # 1. Missing order coordinates, 2. Invalid order coordinates
    op_id = uuid4()
    o1 = Order(id=uuid4(), operator_id=op_id, reference_number="O1", destination_location=None, weight_kg=50, status="PENDING", scenario="DEMO")
    o2 = Order(id=uuid4(), operator_id=op_id, reference_number="O2", destination_location=create_mock_wkb(181.0, 91.0), weight_kg=50, status="PENDING", scenario="DEMO")
    
    d1 = Depot(id=uuid4(), operator_id=op_id, name="D1", location=None, scenario="DEMO")
    d2 = Depot(id=uuid4(), operator_id=op_id, name="D2", location=create_mock_wkb(math.nan, math.nan), scenario="DEMO")
    
    mock_db.query().filter().all.side_effect = [[d1, d2], [], [o1, o2]]
    
    builder = RoutingDatasetBuilder(mock_db)
    dataset = builder.build_dataset("DEMO")
    
    assert len(dataset.orders) == 0
    assert len(dataset.depots) == 0
    assert len(dataset.issues) == 4
    
    # Depot issues
    assert dataset.issues[0].record_type == "Depot"
    assert dataset.issues[0].record_id == d1.id
    assert dataset.issues[1].record_type == "Depot"
    assert dataset.issues[1].record_id == d2.id
    
    # Order issues
    assert dataset.issues[2].record_type == "Order"
    assert dataset.issues[2].record_id == o1.id
    assert dataset.issues[3].record_type == "Order"
    assert dataset.issues[3].record_id == o2.id

def test_empty_matching_dataset(mock_db):
    # 12. Empty/no matching dataset behavior.
    mock_db.query().filter().all.side_effect = [[], [], []]
    
    builder = RoutingDatasetBuilder(mock_db)
    dataset = builder.build_dataset("NETWORK")
    
    assert dataset.scenario == "NETWORK"
    assert len(dataset.depots) == 0
    assert len(dataset.vehicles) == 0
    assert len(dataset.orders) == 0
    # 13. Deterministic output structure
    assert isinstance(dataset, RoutingDataset)

# ----------------- API / AUTHENTICATION TESTS ----------------- #

MOCK_ADMIN_PROFILE = Profile(id=uuid4(), role='ADMIN', operator_id=None)
MOCK_OPERATOR_A_ID = uuid4()
MOCK_OPERATOR_PROFILE = Profile(id=uuid4(), role='OPERATOR', operator_id=MOCK_OPERATOR_A_ID)

@patch("app.api.v1.routing.RoutingDatasetBuilder.build_dataset")
def test_admin_dataset_access(mock_build, mock_db):
    # 9. Admin dataset access.
    mock_build.return_value = RoutingDataset(scenario="DEMO", depots=[], vehicles=[], orders=[])
    
    app.dependency_overrides[get_current_profile] = lambda: MOCK_ADMIN_PROFILE
    app.dependency_overrides[get_db] = lambda: mock_db
    
    # Fetch all
    response = client.get("/api/v1/routing/dataset?scenario=DEMO")
    assert response.status_code == 200
    mock_build.assert_called_with(scenario="DEMO", operator_id=None)
    
    # Fetch specific
    specific_op = uuid4()
    response = client.get(f"/api/v1/routing/dataset?scenario=DEMO&operator_id={str(specific_op)}")
    assert response.status_code == 200
    mock_build.assert_called_with(scenario="DEMO", operator_id=specific_op)

@patch("app.api.v1.routing.RoutingDatasetBuilder.build_dataset")
def test_operator_ownership_isolation(mock_build, mock_db):
    # 10. Operator ownership isolation.
    # 11. No cross-operator data leakage.
    mock_build.return_value = RoutingDataset(scenario="NETWORK", operator_id=MOCK_OPERATOR_A_ID, depots=[], vehicles=[], orders=[])
    
    app.dependency_overrides[get_current_profile] = lambda: MOCK_OPERATOR_PROFILE
    app.dependency_overrides[get_db] = lambda: mock_db
    
    # Fetch all (should be restricted to their own ID)
    response = client.get("/api/v1/routing/dataset?scenario=NETWORK")
    assert response.status_code == 200
    mock_build.assert_called_with(scenario="NETWORK", operator_id=MOCK_OPERATOR_A_ID)
    
    # Try to fetch another operator's data (should STILL be restricted to their own ID)
    malicious_op = uuid4()
    response = client.get(f"/api/v1/routing/dataset?scenario=NETWORK&operator_id={str(malicious_op)}")
    assert response.status_code == 200
    # Crucially, the target_operator_id must be the operator's own ID, ignoring the query param
    mock_build.assert_called_with(scenario="NETWORK", operator_id=MOCK_OPERATOR_A_ID)
    
    app.dependency_overrides = {}
