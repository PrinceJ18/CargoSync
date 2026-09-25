import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

try:
    cur.execute("TRUNCATE TABLE operators, depots, vehicles, orders, return_loads CASCADE;")
    with open('../supabase/seed.sql', encoding='utf-8') as f:
        cur.execute(f.read())
    conn.commit()
    print('Seeded successfully')
except Exception as e:
    conn.rollback()
    print('Error:', e)
finally:
    cur.close()
    conn.close()
