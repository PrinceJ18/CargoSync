import os
import sys
from jose import jwt
from datetime import datetime, timedelta, timezone

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))
from app.core.config import settings

def make_token():
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "87e27dda-bcdf-4d2a-8f88-56cc22b049f5",
        "aud": "authenticated",
        "iss": "supabase",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=1)).timestamp()),
        "role": "authenticated"
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")

token = make_token()
headers = {"Authorization": f"Bearer {token}"}

import urllib.request
import json
import ssl

def test_endpoint(path, method="GET", body=None):
    url = f"http://localhost:8000/api/v1{path}"
    
    if body:
        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={**headers, "Content-Type": "application/json"}, method=method)
    else:
        req = urllib.request.Request(url, headers=headers, method=method)
        
    try:
        with urllib.request.urlopen(req, context=ssl._create_unverified_context()) as resp:
            data = json.loads(resp.read().decode())
            print(f"--- {method} {path} ---")
            print(f"Status: {resp.status}")
            if method == "POST" and path == "/optimization/runs":
                print(f"Run ID: {data.get('run_id')}")
                print(f"Solver Status: {data.get('solver_status')}")
                print(f"Routes generated: {len(data.get('routes', []))}")
                print(f"Diagnostics: {len(data.get('diagnostics', []))}")
            elif isinstance(data, dict) and "items" in data:
                print(f"Total: {data.get('total')}, Returned items: {len(data['items'])}")
            elif isinstance(data, list):
                print(f"Returned items: {len(data)}")
            else:
                print("Response:", list(data.keys()) if isinstance(data, dict) else type(data))
    except urllib.error.HTTPError as e:
        print(f"--- {method} {path} ---")
        print(f"Status: {e.code}")
        print("Response:", e.read().decode()[:200])
    print()

test_endpoint("/orders/")
test_endpoint("/optimization/latest?scenario=DEMO")


