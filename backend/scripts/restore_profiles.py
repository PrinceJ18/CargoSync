import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

try:
    # 1. admin@cargosync.com -> ADMIN
    cur.execute("INSERT INTO profiles (id, role, created_at, updated_at) VALUES ('f47431e9-6917-4f81-ae46-2e7bf3e7ed0c', 'ADMIN', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;")
    
    # 2. admin@cargosync.ai -> ADMIN
    cur.execute("INSERT INTO profiles (id, role, created_at, updated_at) VALUES ('81ceea0f-ba43-4818-a457-58ad318ab871', 'ADMIN', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;")
    
    # 3. shree.balaji.log01@gmail.com -> OPERATOR
    cur.execute("INSERT INTO profiles (id, role, operator_id, created_at, updated_at) VALUES ('0308d407-0c5e-4b24-a19b-70235d9053cb', 'OPERATOR', '11111111-1111-1111-1111-111111111111', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;")
    
    # 4. demoemail@gmail.com -> OPERATOR
    cur.execute("INSERT INTO profiles (id, role, operator_id, created_at, updated_at) VALUES ('c6ce0adb-f95b-4a6e-97e8-1c6fe5549775', 'OPERATOR', '11111111-1111-1111-1111-111111111111', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;")
    
    # 5. princejain.1218@gmail.com -> ADMIN
    cur.execute("INSERT INTO profiles (id, role, created_at, updated_at) VALUES ('81520c76-f213-40b8-9890-ed5ec46a217f', 'ADMIN', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;")
    
    # 6. 238.prince.j@gmail.com -> OPERATOR (just in case)
    cur.execute("INSERT INTO profiles (id, role, operator_id, created_at, updated_at) VALUES ('87e27dda-bcdf-4d2a-8f88-56cc22b049f5', 'OPERATOR', '11111111-1111-1111-1111-111111111111', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;")
    
    conn.commit()
    print('Profiles restored successfully')
except Exception as e:
    conn.rollback()
    print('Error:', e)
finally:
    cur.close()
    conn.close()
