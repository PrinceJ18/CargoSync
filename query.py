import psycopg2
DATABASE_URL = 'postgresql://postgres:CargoSync.1218@db.vogmsaaadrkuyztrniuy.supabase.co:5432/postgres'
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()
cur.execute('''SELECT proname FROM pg_proc WHERE prosrc ILIKE '%insert into profiles%' OR prosrc ILIKE '%insert into "profiles"%';''')
print("Found functions:")
for row in cur.fetchall():
    print(row[0])
