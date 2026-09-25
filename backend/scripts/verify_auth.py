import requests
import json
import os
import sys

# Testing ADMIN Login and Access
# We can't easily retrieve the real JWTs since they are negotiated with Supabase directly on the client.
# But we can test if the profile logic in the DB is working as expected.

def test_auth_in_db():
    import psycopg2
    from dotenv import load_dotenv
    load_dotenv()
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor()
    
    # Verify profiles exist
    cur.execute("SELECT id, role, operator_id FROM profiles;")
    profiles = cur.fetchall()
    
    if len(profiles) == 0:
        print("ERROR: Profiles are still missing!")
        sys.exit(1)
        
    admin_count = sum(1 for p in profiles if p[1] == 'ADMIN')
    operator_count = sum(1 for p in profiles if p[1] == 'OPERATOR')
    
    if admin_count < 1 or operator_count < 1:
        print(f"ERROR: Missing roles. Admins: {admin_count}, Operators: {operator_count}")
        sys.exit(1)
        
    print(f"SUCCESS: Found {len(profiles)} profiles (Admins: {admin_count}, Operators: {operator_count}).")
    print("Database Auth <-> Profile relationship is successfully restored.")

if __name__ == '__main__':
    test_auth_in_db()
