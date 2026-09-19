import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from uuid import uuid4
from fastapi.testclient import TestClient
import httpx
import math
import os

# Set dummy OSRM URL for tests so client init doesn't throw RuntimeError
os.environ["OSRM_BASE_URL"] = "http://test-osrm.local"

from app.main import app
from app.api.dependencies import get_current_profile
from app.db.models import Profile
from app.services.routing.coordinate_validator import is_valid_global_coordinate, is_within_operational_region
from app.services.routing.schemas import Coordinate, RoutingRequest
from app.api.v1.routing import get_routing_service
from app.services.routing.routing_service import RoutingService
from app.services.routing.osrm_client import OSRMClient
from app.services.routing.exceptions import (
    CoordinateValidationError, ProviderTimeoutError, ProviderHTTPError, NoRouteFoundError
)

client = TestClient(app)

MOCK_PROFILE = Profile(id=uuid4(), role='OPERATOR', operator_id=uuid4())

# Override auth dependency
def override_get_current_profile():
    return MOCK_PROFILE

app.dependency_overrides[get_current_profile] = override_get_current_profile

# Override routing service dependency to bypass RuntimeError on missing config
def override_get_routing_service():
    dummy_client = OSRMClient(base_url="http://test")
    return RoutingService(client=dummy_client)

app.dependency_overrides[get_routing_service] = override_get_routing_service

def test_coordinate_validation_valid():
    assert is_valid_global_coordinate(22.7196, 75.8577) is True
    
def test_coordinate_validation_invalid_bounds():
    assert is_valid_global_coordinate(91.0, 75.8577) is False
    assert is_valid_global_coordinate(22.7196, 181.0) is False
    assert is_valid_global_coordinate(-91.0, 75.8577) is False

def test_coordinate_validation_nan_inf():
    assert is_valid_global_coordinate(math.nan, 75.8577) is False
    assert is_valid_global_coordinate(math.inf, 75.8577) is False

def test_operational_region():
    assert is_within_operational_region(22.7196, 75.8577) is True  # Indore
    assert is_within_operational_region(40.7128, -74.0060) is False # NY

def test_routing_request_schema():
    # Invalid lat should raise error from Pydantic
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        Coordinate(latitude=100.0, longitude=0.0)
        
    req = RoutingRequest(
        origin={"latitude": 22.0, "longitude": 75.0},
        destination={"latitude": 23.0, "longitude": 76.0},
    )
    assert req.origin.latitude == 22.0

import asyncio

@patch('httpx.AsyncClient.get')
def test_osrm_successful_response(mock_get):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "code": "Ok",
        "routes": [{
            "distance": 1500.5,
            "duration": 300.2,
            "geometry": {"type": "LineString", "coordinates": [[75.0, 22.0], [76.0, 23.0]]}
        }]
    }
    mock_get.return_value = mock_response
    
    osrm = OSRMClient(base_url="http://test")
    coords = [Coordinate(latitude=22.0, longitude=75.0), Coordinate(latitude=23.0, longitude=76.0)]
    result = asyncio.run(osrm.get_route(coords))
    
    assert result["distance"] == 1500.5
    assert result["duration"] == 300.2
    assert result["geometry"]["type"] == "LineString"

@patch('httpx.AsyncClient.get')
def test_osrm_timeout(mock_get):
    mock_get.side_effect = httpx.TimeoutException("Timeout")
    
    osrm = OSRMClient(base_url="http://test")
    coords = [Coordinate(latitude=22.0, longitude=75.0), Coordinate(latitude=23.0, longitude=76.0)]
    
    with pytest.raises(ProviderTimeoutError):
        asyncio.run(osrm.get_route(coords))

@patch('httpx.AsyncClient.get')
def test_osrm_http_500(mock_get):
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error"
    mock_get.return_value = mock_response
    
    osrm = OSRMClient(base_url="http://test")
    coords = [Coordinate(latitude=22.0, longitude=75.0), Coordinate(latitude=23.0, longitude=76.0)]
    
    with pytest.raises(ProviderHTTPError):
        asyncio.run(osrm.get_route(coords))

@patch('httpx.AsyncClient.get')
def test_osrm_no_route(mock_get):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"code": "NoRoute"}
    mock_get.return_value = mock_response
    
    osrm = OSRMClient(base_url="http://test")
    coords = [Coordinate(latitude=22.0, longitude=75.0), Coordinate(latitude=23.0, longitude=76.0)]
    
    with pytest.raises(NoRouteFoundError):
        asyncio.run(osrm.get_route(coords))

@patch('app.services.routing.routing_service.OSRMClient.get_route', new_callable=AsyncMock)
def test_api_multi_stop_success(mock_get_route):
    mock_get_route.return_value = {
        "distance": 5000.0,
        "duration": 600.0,
        "geometry": {"type": "LineString", "coordinates": []}
    }
    
    payload = {
        "origin": {"latitude": 22.1, "longitude": 75.1},
        "destination": {"latitude": 22.3, "longitude": 75.3},
        "waypoints": [{"latitude": 22.2, "longitude": 75.2}]
    }
    
    response = client.post("/api/v1/routing/route", json=payload, headers={"Authorization": "Bearer fake"})
    if response.status_code != 200:
        print(response.json())
    assert response.status_code == 200
    data = response.json()
    assert data["distance_meters"] == 5000.0
    assert data["provider"] == "osrm"

def test_api_unauthenticated():
    # Remove override to test unauthenticated rejection natively
    if get_current_profile in app.dependency_overrides:
        app.dependency_overrides.pop(get_current_profile)
        
    response = client.post("/api/v1/routing/route", json={
        "origin": {"latitude": 22.1, "longitude": 75.1},
        "destination": {"latitude": 22.3, "longitude": 75.3}
    })
    assert response.status_code == 401
    
    # Restore override for subsequent tests if any
    app.dependency_overrides[get_current_profile] = override_get_current_profile
