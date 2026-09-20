import math
from abc import ABC, abstractmethod
from typing import Tuple

class DistanceProvider(ABC):
    """
    Abstract metric-agnostic distance provider for clustering.
    Provides geographic distance between two points in meters.
    """
    
    @abstractmethod
    def distance_meters(self, point_a: Tuple[float, float], point_b: Tuple[float, float]) -> float:
        """
        Calculate distance between point_a (lat, lon) and point_b (lat, lon).
        Returns distance in meters.
        """
        pass


class HaversineDistanceProvider(DistanceProvider):
    """
    Implements geodesic (straight-line) distance using the Haversine formula.
    Assumes WGS84 coordinates (Latitude, Longitude).
    """
    
    # Earth radius in meters
    EARTH_RADIUS_METERS = 6371000.0
    
    def distance_meters(self, point_a: Tuple[float, float], point_b: Tuple[float, float]) -> float:
        lat1, lon1 = point_a
        lat2, lon2 = point_b
        
        # Convert latitude and longitude from degrees to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        # Haversine formula
        a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
        
        # Bound 'a' between 0 and 1 strictly to prevent float precision errors in asin
        a = min(1.0, max(0.0, a))
        
        c = 2 * math.asin(math.sqrt(a))
        
        return self.EARTH_RADIUS_METERS * c
