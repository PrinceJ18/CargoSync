import hashlib
import json
import asyncio
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db.models import RoutingMatrixCache, RouteGeometryCache
from typing import List, Dict, Any, Optional
from app.services.routing.schemas import Coordinate
from app.services.routing.exceptions import (
    ProviderTimeoutError,
    ProviderHTTPError,
    NoRouteFoundError,
    MalformedResponseError
)
from app.core.config import settings
import httpx

def _hash_coords(coords: List[Coordinate], prefix: str) -> str:
    coord_strings = [f"{c.longitude},{c.latitude}" for c in coords]
    coords_path = ";".join(coord_strings)
    raw = f"{prefix}:{coords_path}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def _check_route_cache(signature: str, provider: str) -> Optional[Dict[str, Any]]:
    try:
        db = SessionLocal()
        cached = db.query(RouteGeometryCache).filter(
            RouteGeometryCache.provider == provider,
            RouteGeometryCache.signature == signature
        ).first()
        if cached:
            return {
                "distance": float(cached.distance),
                "duration": float(cached.duration),
                "geometry": cached.geometry
            }
    except Exception as e:
        print(f"Error reading from route cache: {e}")
    finally:
        if 'db' in locals():
            db.close()
    return None

def _write_route_cache(signature: str, provider: str, route: Dict[str, Any]):
    try:
        db = SessionLocal()
        cache_entry = RouteGeometryCache(
            provider=provider,
            signature=signature,
            distance=route["distance"],
            duration=route["duration"],
            geometry=route["geometry"]
        )
        db.add(cache_entry)
        db.commit()
    except Exception as e:
        print(f"Error writing to route cache: {e}")
        if 'db' in locals():
            db.rollback()
    finally:
        if 'db' in locals():
            db.close()

def _check_matrix_cache(signature: str, provider: str) -> Optional[Dict[str, Any]]:
    try:
        db = SessionLocal()
        cached = db.query(RoutingMatrixCache).filter(
            RoutingMatrixCache.provider == provider,
            RoutingMatrixCache.signature == signature
        ).first()
        if cached:
            return {
                "distances": cached.distances,
                "durations": cached.durations
            }
    except Exception as e:
        print(f"Error reading from matrix cache: {e}")
    finally:
        if 'db' in locals():
            db.close()
    return None

def _write_matrix_cache(signature: str, provider: str, distances: list, durations: list):
    try:
        db = SessionLocal()
        cache_entry = RoutingMatrixCache(
            provider=provider,
            signature=signature,
            distances=distances,
            durations=durations
        )
        db.add(cache_entry)
        db.commit()
    except Exception as e:
        print(f"Error writing to matrix cache: {e}")
        if 'db' in locals():
            db.rollback()
    finally:
        if 'db' in locals():
            db.close()

class OSRMClient:
    """Client for communicating with an OSRM-compatible routing backend"""
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or (settings.OSRM_BASE_URL.rstrip("/") if settings.OSRM_BASE_URL else None)
        if not self.base_url:
            raise RuntimeError("Routing provider is not configured. OSRM_BASE_URL must be set.")
        self.provider_name = "OSRM"
        
    async def get_route(self, coords: List[Coordinate]) -> Dict[str, Any]:
        if len(coords) < 2:
            raise ValueError("At least two coordinates (origin, destination) are required.")
            
        signature = _hash_coords(coords, "route")
        
        # Check cache
        cached = await asyncio.to_thread(_check_route_cache, signature, self.provider_name)
        if cached:
            return cached
            
        coord_strings = [f"{c.longitude},{c.latitude}" for c in coords]
        coords_path = ";".join(coord_strings)
        
        url = f"{self.base_url}/route/v1/driving/{coords_path}?overview=full&geometries=geojson"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, timeout=10.0)
            except httpx.TimeoutException as e:
                raise ProviderTimeoutError(f"OSRM provider timed out: {e}")
            except httpx.RequestError as e:
                raise ProviderHTTPError(f"OSRM provider network error: {e}")
                
        if response.status_code != 200:
            try:
                data = response.json()
                if data.get("code") == "NoRoute":
                    raise NoRouteFoundError("No valid route found between the provided coordinates.")
            except Exception:
                pass
            raise ProviderHTTPError(f"OSRM returned HTTP {response.status_code}: {response.text}")
            
        try:
            data = response.json()
        except ValueError:
            raise MalformedResponseError("OSRM response was not valid JSON.")
            
        if data.get("code") != "Ok":
            if data.get("code") == "NoRoute":
                raise NoRouteFoundError("No valid route found between the provided coordinates.")
            raise MalformedResponseError(f"OSRM returned non-Ok code: {data.get('code')}")
            
        routes = data.get("routes")
        if not routes or not isinstance(routes, list) or len(routes) == 0:
            raise NoRouteFoundError("OSRM returned OK but provided no routes.")
            
        route = routes[0]
        
        if "distance" not in route or "duration" not in route or "geometry" not in route:
            raise MalformedResponseError("OSRM route object missing required distance, duration, or geometry.")
            
        # Write to cache
        await asyncio.to_thread(_write_route_cache, signature, self.provider_name, route)
            
        return route

    async def get_table(self, coords: List[Coordinate], sources: List[int] = None, destinations: List[int] = None) -> Dict[str, Any]:
        if len(coords) < 2:
            raise ValueError("At least two coordinates are required for a matrix.")
            
        signature = _hash_coords(coords, "matrix")
        
        # Check cache (only check cache if full table is requested for now)
        if not sources and not destinations:
            cached = await asyncio.to_thread(_check_matrix_cache, signature, self.provider_name)
            if cached:
                return cached
            
        coord_strings = [f"{c.longitude},{c.latitude}" for c in coords]
        coords_path = ";".join(coord_strings)
        
        url = f"{self.base_url}/table/v1/driving/{coords_path}?annotations=distance,duration"
        if sources is not None:
            url += "&sources=" + ";".join(map(str, sources))
        if destinations is not None:
            url += "&destinations=" + ";".join(map(str, destinations))
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, timeout=30.0)
            except httpx.TimeoutException as e:
                raise ProviderTimeoutError(f"OSRM provider timed out: {e}")
            except httpx.RequestError as e:
                raise ProviderHTTPError(f"OSRM provider network error: {e}")
                
        if response.status_code != 200:
            raise ProviderHTTPError(f"OSRM returned HTTP {response.status_code}: {response.text}")
            
        try:
            data = response.json()
        except ValueError:
            raise MalformedResponseError("OSRM response was not valid JSON.")
            
        if data.get("code") != "Ok":
            raise MalformedResponseError(f"OSRM returned non-Ok code: {data.get('code')}")
            
        distances = data.get("distances")
        durations = data.get("durations")
        
        if distances is None or durations is None:
            raise MalformedResponseError("OSRM table object missing required distances or durations.")
            
        # Write to cache
        if not sources and not destinations:
            await asyncio.to_thread(_write_matrix_cache, signature, self.provider_name, distances, durations)
            
        return {
            "distances": distances,
            "durations": durations
        }
