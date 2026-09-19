from typing import Optional
from pydantic import BaseModel, Field

def is_valid_global_coordinate(lat: float, lon: float) -> bool:
    """Check if coordinates are globally valid."""
    if lat is None or lon is None:
        return False
    try:
        lat_f = float(lat)
        lon_f = float(lon)
    except (ValueError, TypeError):
        return False
        
    import math
    if math.isnan(lat_f) or math.isnan(lon_f) or math.isinf(lat_f) or math.isinf(lon_f):
        return False
        
    if not (-90.0 <= lat_f <= 90.0):
        return False
    if not (-180.0 <= lon_f <= 180.0):
        return False
        
    return True

def is_within_operational_region(lat: float, lon: float) -> bool:
    """
    Check if coordinates are within the CargoSync operational region (Indore/Dewas/Ujjain/Dhar).
    This is an optional check and shouldn't block legitimate global coordinates if needed.
    Rough bounding box for MP logistics corridor:
    Lat: 22.0 to 24.0
    Lon: 74.0 to 77.0
    """
    if not is_valid_global_coordinate(lat, lon):
        return False
    
    if not (22.0 <= lat <= 24.0):
        return False
    if not (74.0 <= lon <= 77.0):
        return False
        
    return True
