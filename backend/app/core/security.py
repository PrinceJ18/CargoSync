"""
Supabase JWT authentication for FastAPI.

Supabase signs user access tokens with ES256 (ECDSA P-256).  The corresponding
public keys are published at the standard JWKS endpoint:
    {SUPABASE_URL}/auth/v1/.well-known/jwks.json

This module:
- Lazily fetches and caches the JWKS key set on first request.
- Selects the verification key using the token header's `kid`.
- Refreshes the JWKS once if an unknown `kid` is encountered (key rotation).
- Falls back to HS256 verification with SUPABASE_JWT_SECRET for service tokens
  only when the token header explicitly declares HS256.
"""

from __future__ import annotations

import json
import logging
import threading
import time
import urllib.request
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, jwk

from app.core.config import settings

logger = logging.getLogger(__name__)
security = HTTPBearer()

# ---------------------------------------------------------------------------
# JWKS cache
# ---------------------------------------------------------------------------
_JWKS_REFRESH_MIN_INTERVAL_SECONDS = 300  # Don't refetch more often than 5 min

_jwks_cache: Dict[str, Any] = {}        # kid → jose JWK key object
_jwks_last_fetched: float = 0.0
_jwks_lock = threading.Lock()


def _fetch_jwks() -> Dict[str, Any]:
    """Fetch JWKS from Supabase and return a dict mapping kid → JWK key."""
    global _jwks_cache, _jwks_last_fetched

    if not settings.SUPABASE_URL:
        logger.warning("SUPABASE_URL not set — cannot fetch JWKS")
        return {}

    jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    try:
        with urllib.request.urlopen(jwks_url, timeout=10) as resp:
            jwks_data = json.loads(resp.read())
    except Exception as e:
        logger.warning("Failed to fetch Supabase JWKS from %s: %s", jwks_url, e)
        return _jwks_cache  # Return stale cache on failure

    new_cache: Dict[str, Any] = {}
    for key_data in jwks_data.get("keys", []):
        kid = key_data.get("kid")
        alg = key_data.get("alg")
        if not kid or not alg:
            continue
        try:
            new_cache[kid] = jwk.construct(key_data, algorithm=alg)
            logger.info("Loaded JWKS key kid=%s alg=%s", kid, alg)
        except Exception as e:
            logger.warning("Failed to construct JWKS key kid=%s: %s", kid, e)

    _jwks_cache = new_cache
    _jwks_last_fetched = time.monotonic()
    return _jwks_cache


def _get_jwks_key(kid: str) -> Optional[Any]:
    """
    Look up a JWKS key by `kid`.

    On the first call, fetches the JWKS lazily (avoids blocking startup if
    Supabase is temporarily unreachable).

    If the kid is not in the cache, refreshes the JWKS once (handles key
    rotation) but throttles refetch to avoid hammering the endpoint.
    """
    with _jwks_lock:
        # Lazy initial fetch
        if not _jwks_cache:
            _fetch_jwks()

        key = _jwks_cache.get(kid)
        if key is not None:
            return key

        # kid not found — try refreshing (key rotation), throttled
        elapsed = time.monotonic() - _jwks_last_fetched
        if elapsed >= _JWKS_REFRESH_MIN_INTERVAL_SECONDS:
            logger.info("Unknown kid=%s — refreshing JWKS", kid)
            _fetch_jwks()
            return _jwks_cache.get(kid)
        else:
            logger.warning(
                "Unknown kid=%s — JWKS refresh throttled (last fetch %.0fs ago)",
                kid, elapsed
            )
            return None


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Decodes and validates the Supabase JWT.

    Does NOT replace RLS — merely identifies the user for backend
    application logic.
    """
    token = credentials.credentials

    # Read the unverified header to determine algorithm and key id
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as e:
        logger.warning("Malformed JWT header: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    alg = header.get("alg")
    kid = header.get("kid")

    # ------ ES256 path (user access tokens) ------
    if alg == "ES256":
        if not kid:
            logger.warning("ES256 token missing kid")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing key ID",
                headers={"WWW-Authenticate": "Bearer"},
            )

        key = _get_jwks_key(kid)
        if key is None:
            logger.warning("No JWKS key found for kid=%s", kid)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: unknown signing key",
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            payload = jwt.decode(
                token,
                key,
                algorithms=["ES256"],
                audience="authenticated",
            )
            return payload
        except JWTError as e:
            logger.warning("ES256 JWT validation failed: %s", e)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # ------ HS256 path (service/anon tokens, legacy) ------
    elif alg == "HS256":
        if not settings.SUPABASE_JWT_SECRET:
            logger.error("SUPABASE_JWT_SECRET is not configured.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication is not configured securely",
            )

        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
            return payload
        except JWTError as e:
            logger.warning("HS256 JWT validation failed: %s", e)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # ------ Unsupported algorithm ------
    else:
        logger.warning("Unsupported JWT algorithm: %s", alg)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unsupported token algorithm",
            headers={"WWW-Authenticate": "Bearer"},
        )
