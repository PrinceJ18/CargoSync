import uuid
import random

SEED_FILE = "d:/CargoSync-Round2/supabase/seed.sql"

NAMESPACE = uuid.UUID('00000000-0000-0000-0000-000000000000')

def gen_id(name: str) -> str:
    return str(uuid.uuid5(NAMESPACE, name))

REALISTIC_OPERATORS = [
    "Shree Balaji Logistics",
    "Aakash Road Carriers",
    "Ramesh Transport Services",
    "Suresh Freight Movers",
    "Indore Express Logistics",
    "Central India Cargo Services",
    "Malwa Logistics Network",
    "Shree Ganesh Transport",
    "Patel Freight Solutions",
    "Rajputana Cargo Movers",
    "Mahakal Road Logistics",
    "Vijay Transport Corporation",
    "Narmada Valley Freight",
    "Dhar Logistics Hub",
    "MP Roadlines",
    "Ujjain Freight Systems",
    "Indore Malwa Carriers",
    "Central Bharat Movers",
    "Dewas Transport Co",
    "Pithampur Cargo Movers"
]

REALISTIC_DEPOTS = {
    "Vijay Nagar": "Vijay Nagar Distribution Hub",
    "Rajwada": "Rajwada Freight Yard",
    "Palasia": "Palasia Distribution Centre",
    "Dewas": "Dewas Naka Cargo Hub",
    "Ujjain": "Ujjain Road Distribution Hub"
}

REALISTIC_VEHICLE_MODELS = [
    ("Tata 407", "VAN", 1000),
    ("Ashok Leyland Dost", "VAN", 1250),
    ("Mahindra Bolero Pickup", "VAN", 800),
    ("Tata 709", "TRUCK", 2500),
    ("Eicher Pro 2055", "TRUCK", 3000),
    ("BharatBenz 1217", "TRUCK", 5500),
    ("Tata 1109", "TRUCK", 6000)
]

random.seed(42)

def generate_mp_registration():
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    rto = random.choice(["09", "04", "13", "10", "43"])
    l1 = random.choice(letters)
    l2 = random.choice(letters)
    nums = str(random.randint(1000, 9999))
    return f"MP{rto}{l1}{l2}{nums}"

def generate_order_ref(seq_number):
    prefix = random.choice(["IND", "MPLOG", "CGR", "CARGO", "FRT"])
    date_code = "2609"
    return f"{prefix}-{date_code}{str(seq_number).zfill(3)}"

def generate_time_windows():
    windows = [
        ("09:00:00", "12:00:00"),
        ("10:00:00", "13:00:00"),
        ("11:00:00", "14:00:00"),
        ("12:00:00", "16:00:00"),
        ("14:00:00", "18:00:00"),
        ("16:00:00", "19:00:00")
    ]
    if random.random() < 0.4:
        return "NULL", "NULL"
    w = random.choice(windows)
    return f"'2026-09-26 {w[0]}+00'", f"'2026-09-26 {w[1]}+00'"

OPERATORS = []
OPERATORS.append({"id": '11111111-1111-1111-1111-111111111111', "name": REALISTIC_OPERATORS[0], "demo": True})
OPERATORS.append({"id": '22222222-2222-2222-2222-222222222222', "name": REALISTIC_OPERATORS[1], "demo": True})
OPERATORS.append({"id": '33333333-3333-3333-3333-333333333333', "name": REALISTIC_OPERATORS[2], "demo": True})

for i in range(3, 20):
    OPERATORS.append({"id": gen_id(f"OP_{i+1}"), "name": REALISTIC_OPERATORS[i], "demo": False})

CENTERS = {
    "Vijay Nagar": (22.7533, 75.8937),
    "Rajwada": (22.7180, 75.8550),
    "Palasia": (22.7230, 75.8850),
    "Dewas": (22.9676, 76.0534), 
    "Ujjain": (23.1765, 75.7885) 
}

def generate_location(center, radius_km=3.0):
    lat_offset = (random.uniform(-1, 1) * radius_km) / 111.0
    lon_offset = (random.uniform(-1, 1) * radius_km) / 111.0
    return round(center[0] + lat_offset, 6), round(center[1] + lon_offset, 6)

def build_sql():
    sql = []
    sql.append("-- CargoSync AI — Database Seed Script")
    sql.append("-- Generated deterministically by backend/scripts/generate_seed_sql.py")
    sql.append("-- Supports both DEMO and NETWORK scenarios with completely realistic synthetic names.")
    sql.append("")
    
    # Operators
    sql.append("-- 1. OPERATORS")
    sql.append("INSERT INTO public.operators (id, name, created_at, updated_at) VALUES")
    op_lines = []
    for op in OPERATORS:
        op_lines.append(f"  ('{op['id']}', '{op['name']}', NOW(), NOW())")
    sql.append(",\n".join(op_lines))
    sql.append("ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();\n")
    
    depot_sql = []
    vehicle_sql = []
    order_sql = []
    
    # We will use this sequence to ensure unique IDs and reference numbers
    global_order_counter = 1
    
    for op_idx, op in enumerate(OPERATORS):
        is_demo = op['demo']
        scenarios = ['DEMO', 'NETWORK'] if is_demo else ['NETWORK']
        
        for scenario in scenarios:
            # DEPOT
            depot_id = gen_id(f"DEPOT_{op['id']}_{scenario}")
            center_key = list(CENTERS.keys())[op_idx % 3] if is_demo else list(CENTERS.keys())[op_idx % 5]
            lat, lon = CENTERS[center_key]
            depot_name = f"{op['name']} - {REALISTIC_DEPOTS[center_key]}"
            depot_address = f"{center_key}, MP"
            
            depot_sql.append(f"  ('{depot_id}', '{op['id']}', '{scenario}', '{depot_name}', '{depot_address}', 'SRID=4326;POINT({lon} {lat})')")
            
            # VEHICLES
            num_vehicles = 5 if scenario == 'DEMO' else random.randint(2, 3)
            # Create a set to ensure unique vehicle regs per operator
            assigned_regs = set()
            for v in range(num_vehicles):
                v_id = gen_id(f"VEH_{op['id']}_{scenario}_{v}")
                model_name, v_type, cap = random.choice(REALISTIC_VEHICLE_MODELS)
                
                ref = generate_mp_registration()
                while ref in assigned_regs:
                    ref = generate_mp_registration()
                assigned_regs.add(ref)
                
                vehicle_sql.append(f"  ('{v_id}', '{op['id']}', '{scenario}', '{ref}', '{v_type}', {cap}, 'AVAILABLE', '{depot_id}')")
                
            # ORDERS
            num_orders = 50 if scenario == 'DEMO' else random.randint(20, 30)
            
            if scenario == 'DEMO':
                op_clusters = [list(CENTERS.keys())[op_idx % 3], list(CENTERS.keys())[(op_idx + 1) % 3]]
            else:
                op_clusters = random.sample(list(CENTERS.keys()), k=2)
                
            for o in range(num_orders):
                o_id = gen_id(f"ORD_{op['id']}_{scenario}_{o}")
                
                # 10% outliers
                if random.random() < 0.10:
                    olat = round(lat + random.uniform(-0.5, 0.5), 6)
                    olon = round(lon + random.uniform(-0.5, 0.5), 6)
                else:
                    cluster_center = CENTERS[random.choice(op_clusters)]
                    olat, olon = generate_location(cluster_center, radius_km=2.0)
                    
                # Meaningful varied weight distribution
                # Small box (2-20kg), Pallet (200-800kg), Large (1000-4000kg)
                wt_class = random.choice([1, 1, 1, 2, 2, 3])
                if wt_class == 1:
                    weight = round(random.uniform(5, 50), 1)
                elif wt_class == 2:
                    weight = round(random.uniform(200, 800), 1)
                else:
                    weight = round(random.uniform(1000, 3500), 1)
                    
                ref = generate_order_ref(global_order_counter)
                global_order_counter += 1
                
                p_start, p_end = generate_time_windows()
                d_start, d_end = generate_time_windows()
                
                order_sql.append(f"  ('{o_id}', '{op['id']}', '{scenario}', '{ref}', '{depot_id}', 'SRID=4326;POINT({olon} {olat})', {weight}, 'PENDING', {p_start}, {p_end}, {d_start}, {d_end})")
    
    sql.append("-- 2. DEPOTS")
    sql.append("INSERT INTO public.depots (id, operator_id, scenario, name, address, location) VALUES")
    sql.append(",\n".join(depot_sql))
    sql.append("ON CONFLICT (id) DO UPDATE SET operator_id=EXCLUDED.operator_id, scenario=EXCLUDED.scenario, name=EXCLUDED.name, address=EXCLUDED.address, location=EXCLUDED.location;")
    sql.append("")
    
    sql.append("-- 3. VEHICLES")
    sql.append("INSERT INTO public.vehicles (id, operator_id, scenario, reference_number, vehicle_type, capacity_kg, status, depot_id) VALUES")
    sql.append(",\n".join(vehicle_sql))
    sql.append("ON CONFLICT (id) DO UPDATE SET operator_id=EXCLUDED.operator_id, scenario=EXCLUDED.scenario, reference_number=EXCLUDED.reference_number, vehicle_type=EXCLUDED.vehicle_type, capacity_kg=EXCLUDED.capacity_kg, status=EXCLUDED.status, depot_id=EXCLUDED.depot_id;")
    sql.append("")
    
    sql.append("-- 4. ORDERS")
    sql.append("INSERT INTO public.orders (id, operator_id, scenario, reference_number, origin_depot_id, destination_location, weight_kg, status, pickup_window_start, pickup_window_end, delivery_window_start, delivery_window_end) VALUES")
    sql.append(",\n".join(order_sql))
    sql.append("ON CONFLICT (id) DO UPDATE SET operator_id=EXCLUDED.operator_id, scenario=EXCLUDED.scenario, reference_number=EXCLUDED.reference_number, origin_depot_id=EXCLUDED.origin_depot_id, destination_location=EXCLUDED.destination_location, weight_kg=EXCLUDED.weight_kg, status=EXCLUDED.status, pickup_window_start=EXCLUDED.pickup_window_start, pickup_window_end=EXCLUDED.pickup_window_end, delivery_window_start=EXCLUDED.delivery_window_start, delivery_window_end=EXCLUDED.delivery_window_end;")
    sql.append("")
    
    with open(SEED_FILE, 'w', encoding='utf-8') as f:
        f.write("\n".join(sql))
        
    print(f"Generated {len(OPERATORS)} Operators, {len(depot_sql)} Depots, {len(vehicle_sql)} Vehicles, {len(order_sql)} Orders.")

if __name__ == "__main__":
    build_sql()
