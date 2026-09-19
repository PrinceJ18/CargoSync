-- CargoSync AI: Step 3.1 Core Logistics Schema
-- Establishes Depots, Vehicles, and Orders with PostGIS and RLS.

-- 1. Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;

-- 2. Create helper function for RLS
CREATE OR REPLACE FUNCTION public.get_auth_operator_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT operator_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 3. ENUMS
CREATE TYPE vehicle_status AS ENUM ('AVAILABLE', 'MAINTENANCE', 'IN_TRANSIT');
CREATE TYPE order_status AS ENUM ('PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED');

-- 4. DEPOTS Table
CREATE TABLE public.depots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
    scenario TEXT NOT NULL DEFAULT 'DEMO',
    name TEXT NOT NULL,
    address TEXT,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. VEHICLES Table
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
    scenario TEXT NOT NULL DEFAULT 'DEMO',
    reference_number TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    capacity_kg NUMERIC NOT NULL CHECK (capacity_kg > 0),
    status vehicle_status NOT NULL DEFAULT 'AVAILABLE',
    depot_id UUID REFERENCES public.depots(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (operator_id, scenario, reference_number)
);

-- 6. ORDERS Table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
    scenario TEXT NOT NULL DEFAULT 'DEMO',
    reference_number TEXT NOT NULL,
    origin_depot_id UUID REFERENCES public.depots(id) ON DELETE SET NULL,
    destination_location GEOGRAPHY(Point, 4326) NOT NULL,
    weight_kg NUMERIC NOT NULL CHECK (weight_kg > 0),
    status order_status NOT NULL DEFAULT 'PENDING',
    pickup_window_start TIMESTAMPTZ,
    pickup_window_end TIMESTAMPTZ,
    delivery_window_start TIMESTAMPTZ,
    delivery_window_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (operator_id, scenario, reference_number)
);

-- 7. Enable RLS
ALTER TABLE public.depots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 8. Policies: Admins can manage all
CREATE POLICY "Admins can manage all depots" ON public.depots FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage all vehicles" ON public.vehicles FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL TO authenticated USING (public.is_admin());

-- 9. Policies: Operators can manage their own
CREATE POLICY "Operators can manage own depots" ON public.depots FOR ALL TO authenticated 
USING (operator_id = public.get_auth_operator_id()) 
WITH CHECK (operator_id = public.get_auth_operator_id());

CREATE POLICY "Operators can manage own vehicles" ON public.vehicles FOR ALL TO authenticated 
USING (operator_id = public.get_auth_operator_id()) 
WITH CHECK (operator_id = public.get_auth_operator_id());

CREATE POLICY "Operators can manage own orders" ON public.orders FOR ALL TO authenticated 
USING (operator_id = public.get_auth_operator_id()) 
WITH CHECK (operator_id = public.get_auth_operator_id());

-- 10. Geographic Indexes for ST_DWithin performance
CREATE INDEX idx_depots_location ON public.depots USING GIST (location);
CREATE INDEX idx_orders_destination ON public.orders USING GIST (destination_location);

-- 11. B-Tree Indexes for FKs and frequent filters
CREATE INDEX idx_vehicles_operator_scenario ON public.vehicles (operator_id, scenario);
CREATE INDEX idx_orders_operator_scenario ON public.orders (operator_id, scenario);
