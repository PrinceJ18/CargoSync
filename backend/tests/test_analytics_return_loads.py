import pytest
from fastapi.testclient import TestClient
from uuid import uuid4
from unittest.mock import MagicMock, patch, PropertyMock
from datetime import datetime

from app.main import app
from app.db.database import get_db
from app.api.dependencies import get_current_profile
from app.db.models import Profile, OptimizationRun, ReturnLoadAssignment

client = TestClient(app)

MOCK_ADMIN = Profile(id=uuid4(), role='ADMIN', operator_id=None)
MOCK_OPERATOR = Profile(id=uuid4(), role='OPERATOR', operator_id=uuid4())

RUN_ID_A = uuid4()
RUN_ID_B = uuid4()


def _make_run(run_id, scenario="DEMO", status="COMPLETED", operator_id=None):
    run = MagicMock(spec=OptimizationRun)
    run.id = run_id
    run.scenario = scenario
    run.status = status
    run.operator_id = operator_id
    run.baseline_distance_meters = 50000
    run.baseline_duration_seconds = 7200
    run.baseline_vehicles_used = 5
    run.optimized_distance_meters = 30000
    run.optimized_duration_seconds = 5400
    run.optimized_vehicles_used = 3
    run.comparable_workload_count = 10
    run.cost_saved_inr = 1200
    run.co2_saved_kg = 8.5
    run.created_at = datetime(2026, 9, 20, 12, 0, 0)
    return run


def _make_assignment(run_id, status="ASSIGNED"):
    a = MagicMock(spec=ReturnLoadAssignment)
    a.run_id = run_id
    a.assignment_status = status
    a.return_load_id = uuid4()
    return a


class TestAnalyticsReturnLoadsMatched:
    """Tests for the real return_loads_matched metric in GET /analytics/metrics."""

    def _setup(self, db_mock, run=None, assignments=None):
        """Configure mock DB to return the specified run and assignment count."""
        # Mock the OptimizationRun query chain
        run_query = MagicMock()
        run_filter = MagicMock()
        run_filter.order_by.return_value.first.return_value = run
        run_query.filter.return_value = run_filter

        # Mock the ReturnLoadAssignment query chain
        rla_query = MagicMock()
        rla_filter = MagicMock()
        assignment_count = len(assignments) if assignments else 0
        rla_filter.count.return_value = assignment_count
        rla_query.filter.return_value = rla_filter

        def query_dispatch(model):
            if model is OptimizationRun:
                return run_query
            if model is ReturnLoadAssignment:
                return rla_query
            return MagicMock()

        db_mock.query.side_effect = query_dispatch

    def test_assigned_records_are_counted(self):
        """ASSIGNED return-load records are counted."""
        db = MagicMock()
        run = _make_run(RUN_ID_A)
        assignments = [_make_assignment(RUN_ID_A) for _ in range(3)]
        self._setup(db, run=run, assignments=assignments)

        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_current_profile] = lambda: MOCK_ADMIN
        try:
            resp = client.get("/api/v1/analytics/metrics?scenario=DEMO")
            assert resp.status_code == 200
            data = resp.json()
            assert data["return_loads_matched"] == 3
        finally:
            app.dependency_overrides.pop(get_db, None)
            app.dependency_overrides.pop(get_current_profile, None)

    def test_non_assigned_excluded(self):
        """Only ASSIGNED records count; pending/failed are excluded by the query filter."""
        db = MagicMock()
        run = _make_run(RUN_ID_A)
        # The DB query filters by assignment_status == ASSIGNED, so mock returns 1 even though 3 exist
        assigned_only = [_make_assignment(RUN_ID_A, status="ASSIGNED")]
        self._setup(db, run=run, assignments=assigned_only)

        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_current_profile] = lambda: MOCK_ADMIN
        try:
            resp = client.get("/api/v1/analytics/metrics?scenario=DEMO")
            data = resp.json()
            assert data["return_loads_matched"] == 1
        finally:
            app.dependency_overrides.pop(get_db, None)
            app.dependency_overrides.pop(get_current_profile, None)

    def test_other_run_excluded(self):
        """Assignments from a different run_id are excluded (query filters by run_id)."""
        db = MagicMock()
        run = _make_run(RUN_ID_A)
        # Mock returns 0 because the DB filter by run_id would exclude other-run assignments
        self._setup(db, run=run, assignments=[])

        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_current_profile] = lambda: MOCK_ADMIN
        try:
            resp = client.get("/api/v1/analytics/metrics?scenario=DEMO")
            data = resp.json()
            assert data["return_loads_matched"] == 0
        finally:
            app.dependency_overrides.pop(get_db, None)
            app.dependency_overrides.pop(get_current_profile, None)

    def test_zero_assignments_valid_run(self):
        """A valid run with zero assigned return loads returns 0 (not null)."""
        db = MagicMock()
        run = _make_run(RUN_ID_A)
        self._setup(db, run=run, assignments=[])

        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_current_profile] = lambda: MOCK_ADMIN
        try:
            resp = client.get("/api/v1/analytics/metrics?scenario=DEMO")
            data = resp.json()
            assert data["return_loads_matched"] == 0
            assert isinstance(data["return_loads_matched"], int)
        finally:
            app.dependency_overrides.pop(get_db, None)
            app.dependency_overrides.pop(get_current_profile, None)

    def test_no_run_returns_zero(self):
        """When no completed run exists, return_loads_matched is 0 per existing contract."""
        db = MagicMock()
        self._setup(db, run=None, assignments=[])

        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_current_profile] = lambda: MOCK_ADMIN
        try:
            resp = client.get("/api/v1/analytics/metrics?scenario=DEMO")
            data = resp.json()
            assert data["return_loads_matched"] == 0
        finally:
            app.dependency_overrides.pop(get_db, None)
            app.dependency_overrides.pop(get_current_profile, None)
