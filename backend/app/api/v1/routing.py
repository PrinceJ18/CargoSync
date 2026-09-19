from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional
from app.db.database import get_db
from app.api.dependencies import get_current_profile
from app.services.routing.schemas import RoutingRequest, RoutingResponse
from app.services.routing.dataset_schemas import RoutingDataset
from app.services.routing.dataset_builder import RoutingDatasetBuilder
from app.services.routing.routing_service import RoutingService
from app.services.routing.exceptions import (
    CoordinateValidationError,
    ProviderTimeoutError,
    ProviderHTTPError,
    NoRouteFoundError,
    MalformedResponseError
)

router = APIRouter()

def get_routing_service():
    return RoutingService()

@router.post("/route", response_model=RoutingResponse)
async def get_route(
    request: RoutingRequest,
    current_profile = Depends(get_current_profile),
    routing_service: RoutingService = Depends(get_routing_service)
):
    """
    Get a road route between origin, waypoints, and destination.
    Returns distance, duration, and GeoJSON geometry.
    """
    try:
        response = await routing_service.get_route(request)
        return response
    except CoordinateValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except NoRouteFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ProviderTimeoutError as e:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=str(e))
    except (ProviderHTTPError, MalformedResponseError) as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred during routing.")

@router.get("/dataset", response_model=RoutingDataset)
def get_routing_dataset(
    scenario: str = Query(..., description="The scenario (e.g., DEMO or NETWORK)"),
    operator_id: Optional[UUID] = Query(None, description="Filter by operator ID (Admins only)"),
    current_profile = Depends(get_current_profile),
    db: Session = Depends(get_db)
):
    """
    Get a fully validated routing-ready dataset.
    """
    if current_profile.role != 'ADMIN':
        if not current_profile.operator_id:
            raise HTTPException(status_code=403, detail="Operator profile missing operator_id")
        # Force the scope to the operator's own data
        target_operator_id = current_profile.operator_id
    else:
        # Admin can supply an operator_id or fetch all (None)
        target_operator_id = operator_id

    builder = RoutingDatasetBuilder(db)
    return builder.build_dataset(scenario=scenario, operator_id=target_operator_id)
