import pytest
from unittest.mock import patch, MagicMock
from uuid import uuid4

from app.schemas.optimization import OptimizationRunRequest
from app.services.optimization.orchestrator import OptimizationOrchestrator

@pytest.mark.asyncio
@patch("app.services.routing.osrm_client.OSRMClient.__init__", return_value=None)
async def test_orchestrator_initialization_and_empty_workload(mock_osrm):
    # Tests that orchestrator can be initialized independently of HTTP objects (A3 hybrid)
    mock_db = MagicMock()
    
    orchestrator = OptimizationOrchestrator(db=mock_db)
    
    request = OptimizationRunRequest(scenario_id="DEMO")
    
    # Run the orchestrator
    # With a mocked db that doesn't return anything for dataset_builder, it will fail with EmptyWorkloadError
    response = await orchestrator.run_optimization(request)
    
    assert response.status == "FAILED"
    assert len(response.diagnostics) > 0
    assert "depot" in response.diagnostics[0].message.lower()
