import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

emails = ["238.prince.j@gmail.com", "shree.balaji.log01@gmail.com", "demoemail@gmail.com"]

for email in emails:
    # First get UUID from auth.users
    cur.execute("SELECT id FROM auth.users WHERE email = %s", (email,))
    res = cur.fetchone()
    if not res:
        print(f"User {email} not found in auth.users")
        continue
    uid = res[0]
    
    # Get profile
    cur.execute("SELECT role, operator_id FROM profiles WHERE id = %s", (uid,))
    prof = cur.fetchone()
    if not prof:
        print(f"Profile for {email} not found")
        continue
        
    print(f"Email: {email}, ID: {uid}, Role: {prof[0]}, Operator ID: {prof[1]}")

conn.close()
