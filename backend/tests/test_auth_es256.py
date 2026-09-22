"""
Tests for ES256 JWT authentication (security.py).

Uses deterministic test EC keys — does NOT require real Supabase credentials.
"""
import time
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from uuid import uuid4

import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from fastapi import HTTPException
from jose import jwt as jose_jwt, jwk as jose_jwk

# ---------------------------------------------------------------------------
# Deterministic test EC key pair
# ---------------------------------------------------------------------------
_TEST_EC_PRIVATE_KEY = ec.generate_private_key(ec.SECP256R1())
_TEST_EC_PUBLIC_KEY = _TEST_EC_PRIVATE_KEY.public_key()

_TEST_KID = "test-kid-001"

# PEM-encoded private key for signing test tokens
_PRIVATE_PEM = _TEST_EC_PRIVATE_KEY.private_bytes(
    serialization.Encoding.PEM,
    serialization.PrivateFormat.PKCS8,
    serialization.NoEncryption(),
).decode()

# Public key as JWK dict (for constructing jose key)
_public_numbers = _TEST_EC_PUBLIC_KEY.public_numbers()

import base64

def _int_to_b64url(n: int, length: int) -> str:
    return base64.urlsafe_b64encode(n.to_bytes(length, "big")).rstrip(b"=").decode()

_TEST_JWK_DICT = {
    "kty": "EC",
    "crv": "P-256",
    "alg": "ES256",
    "use": "sig",
    "kid": _TEST_KID,
    "x": _int_to_b64url(_public_numbers.x, 32),
    "y": _int_to_b64url(_public_numbers.y, 32),
}


def _make_token(
    sub: str = "87e27dda-bcdf-4d2a-8f88-56cc22b049f5",
    aud: str = "authenticated",
    exp_delta: timedelta = timedelta(hours=1),
    kid: str = _TEST_KID,
    algorithm: str = "ES256",
    key = None,
) -> str:
    """Create a signed JWT for testing."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub,
        "aud": aud,
        "iss": "https://test.supabase.co/auth/v1",
        "iat": int(now.timestamp()),
        "exp": int((now + exp_delta).timestamp()),
        "role": "authenticated",
    }
    headers = {"kid": kid}

    if key is None:
        key = _PRIVATE_PEM

    return jose_jwt.encode(payload, key, algorithm=algorithm, headers=headers)


def _make_jose_key():
    """Construct the jose JWK from the test public key dict."""
    return jose_jwk.construct(_TEST_JWK_DICT, algorithm="ES256")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _patch_jwks_cache():
    """Inject the test JWKS into the security module's cache."""
    import app.core.security as sec

    original_cache = sec._jwks_cache.copy()
    original_fetched = sec._jwks_last_fetched

    sec._jwks_cache = {_TEST_KID: _make_jose_key()}
    sec._jwks_last_fetched = time.monotonic()

    yield

    sec._jwks_cache = original_cache
    sec._jwks_last_fetched = original_fetched


@pytest.fixture()
def _mock_credentials():
    """Factory for HTTPAuthorizationCredentials."""
    def _make(token: str):
        creds = MagicMock()
        creds.credentials = token
        return creds
    return _make


# ---------------------------------------------------------------------------
# Test A — valid ES256 token
# ---------------------------------------------------------------------------

class TestValidES256Token:
    def test_valid_token_accepted(self, _mock_credentials):
        from app.core.security import get_current_user

        token = _make_token()
        creds = _mock_credentials(token)
        payload = get_current_user(creds)

        assert payload["sub"] == "87e27dda-bcdf-4d2a-8f88-56cc22b049f5"
        assert payload["aud"] == "authenticated"

    def test_custom_sub(self, _mock_credentials):
        from app.core.security import get_current_user

        uid = str(uuid4())
        token = _make_token(sub=uid)
        creds = _mock_credentials(token)
        payload = get_current_user(creds)

        assert payload["sub"] == uid


# ---------------------------------------------------------------------------
# Test B — wrong signature
# ---------------------------------------------------------------------------

class TestWrongSignature:
    def test_different_key_rejected(self, _mock_credentials):
        from app.core.security import get_current_user

        # Sign with a DIFFERENT EC key
        other_key = ec.generate_private_key(ec.SECP256R1())
        other_pem = other_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        ).decode()

        token = _make_token(key=other_pem)
        creds = _mock_credentials(token)

        with pytest.raises(HTTPException) as exc:
            get_current_user(creds)
        assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# Test C — wrong algorithm
# ---------------------------------------------------------------------------

class TestWrongAlgorithm:
    def test_unsupported_algorithm_rejected(self, _mock_credentials):
        from app.core.security import get_current_user

        # Create an HS384 token (unsupported)
        token = jose_jwt.encode(
            {"sub": "test", "aud": "authenticated",
             "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp())},
            "secret",
            algorithm="HS384",
            headers={"kid": "fake"},
        )
        creds = _mock_credentials(token)

        with pytest.raises(HTTPException) as exc:
            get_current_user(creds)
        assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# Test D — unknown kid
# ---------------------------------------------------------------------------

class TestUnknownKid:
    def test_unknown_kid_rejected(self, _mock_credentials):
        import app.core.security as sec
        from app.core.security import get_current_user

        # Set last fetched to now so refresh is throttled
        sec._jwks_last_fetched = time.monotonic()

        token = _make_token(kid="nonexistent-kid-999")
        creds = _mock_credentials(token)

        with pytest.raises(HTTPException) as exc:
            get_current_user(creds)
        assert exc.value.status_code == 401
        assert "unknown signing key" in exc.value.detail


# ---------------------------------------------------------------------------
# Test E — expired token
# ---------------------------------------------------------------------------

class TestExpiredToken:
    def test_expired_token_rejected(self, _mock_credentials):
        from app.core.security import get_current_user

        token = _make_token(exp_delta=timedelta(hours=-1))
        creds = _mock_credentials(token)

        with pytest.raises(HTTPException) as exc:
            get_current_user(creds)
        assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# Test F — wrong audience
# ---------------------------------------------------------------------------

class TestWrongAudience:
    def test_wrong_audience_rejected(self, _mock_credentials):
        from app.core.security import get_current_user

        token = _make_token(aud="wrong-audience")
        creds = _mock_credentials(token)

        with pytest.raises(HTTPException) as exc:
            get_current_user(creds)
        assert exc.value.status_code == 401


@pytest.fixture
def mock_db():
    from app.main import app
    from app.db.database import get_db
    db = MagicMock()
    app.dependency_overrides[get_db] = lambda: db
    yield db
    app.dependency_overrides.pop(get_db, None)

class TestProfileResolution:
    def test_admin_profile_resolved(self, _mock_credentials, mock_db):
        """
        Valid token sub=87e27dda... resolves to ADMIN via get_current_profile.
        """
        from app.core.security import get_current_user
        from app.api.dependencies import get_current_profile
        from app.db.models import Profile

        token = _make_token(sub="87e27dda-bcdf-4d2a-8f88-56cc22b049f5")
        creds = _mock_credentials(token)
        payload = get_current_user(creds)

        mock_profile = Profile(id=uuid4(), role="ADMIN", operator_id=None)
        mock_db.query().filter().first.return_value = mock_profile

        profile = get_current_profile(payload, mock_db)
        assert profile.role == "ADMIN"
        assert profile.operator_id is None

# ---------------------------------------------------------------------------
# Test H — unauthenticated (missing Authorization)
# ---------------------------------------------------------------------------

class TestUnauthenticated:
    def test_missing_token_rejected(self, mock_db):
        """HTTPBearer raises 403 automatically for missing Authorization."""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.get("/api/v1/orders/")
        assert response.status_code in (401, 403)
