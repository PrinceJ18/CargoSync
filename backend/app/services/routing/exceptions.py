class RoutingBaseException(Exception):
    """Base exception for all routing errors"""
    pass

class CoordinateValidationError(RoutingBaseException):
    """Raised when provided coordinates are invalid or out of bounds"""
    pass

class ProviderTimeoutError(RoutingBaseException):
    """Raised when the routing provider fails to respond in time"""
    pass

class ProviderHTTPError(RoutingBaseException):
    """Raised when the routing provider returns an HTTP error status"""
    pass

class NoRouteFoundError(RoutingBaseException):
    """Raised when the routing provider successfully processes the request but finds no route"""
    pass

class MalformedResponseError(RoutingBaseException):
    """Raised when the provider's response cannot be parsed or lacks expected data"""
    pass
