class OptimizationInputError(Exception):
    """Raised when the optimization input cannot be constructed due to structural validation failures (e.g. no valid depot, no valid vehicles)."""
    pass

class EmptyWorkloadError(Exception):
    """Raised when there are zero valid orders to route, producing an empty workload state."""
    pass
