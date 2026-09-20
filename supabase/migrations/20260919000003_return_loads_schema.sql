-- CargoSync AI: Step 3.15 Return-Load Schema
-- Establishes Return Loads and Return Load Assignments.

-- 1. ENUMS
CREATE TYPE return_load_status AS ENUM ('PENDING', 'MATCHED', 'FULFILLED', 'CANCELLED');
CREATE TYPE return_load_assignment_status AS ENUM ('ASSIGNED', 'UNASSIGNED_REOPTIMIZATION_FAILED');

-- 2. RETURN_LOADS Table
CREATE TABLE public.return_loads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
    scenario TEXT NOT NULL DEFAULT 'DEMO',
    reference_number TEXT NOT NULL,
    pickup_location GEOGRAPHY(Point, 4326) NOT NULL,
    delivery_location GEOGRAPHY(Point, 4326) NOT NULL,
    weight_kg NUMERIC NOT NULL CHECK (weight_kg > 0),
    status return_load_status NOT NULL DEFAULT 'PENDING',
    pickup_window_start TIMESTAMPTZ,
    pickup_window_end TIMESTAMPTZ,
    delivery_window_start TIMESTAMPTZ,
    delivery_window_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (operator_id, scenario, reference_number)
);

-- 3. RETURN_LOAD_ASSIGNMENTS Table
CREATE TABLE public.return_load_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL, -- references optimization_runs (conceptually, deferring FK constraint for decoupling)
    route_id UUID NOT NULL, -- references routes
    vehicle_id UUID NOT NULL, -- references vehicles
    return_load_id UUID NOT NULL REFERENCES public.return_loads(id) ON DELETE CASCADE,
    assignment_status return_load_assignment_status NOT NULL DEFAULT 'ASSIGNED',
    incremental_detour_meters NUMERIC NOT NULL,
    incremental_duration_seconds NUMERIC NOT NULL,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.return_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_load_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Policies: Admins can manage all
CREATE POLICY "Admins can manage all return_loads" ON public.return_loads FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage all return_load_assignments" ON public.return_load_assignments FOR ALL TO authenticated USING (public.is_admin());

-- 6. Policies: Operators can manage their own
CREATE POLICY "Operators can manage own return_loads" ON public.return_loads FOR ALL TO authenticated 
USING (operator_id = public.get_auth_operator_id()) 
WITH CHECK (operator_id = public.get_auth_operator_id());

CREATE POLICY "Operators can manage assignments mapped to their return loads" ON public.return_load_assignments FOR ALL TO authenticated 
USING (return_load_id IN (SELECT id FROM public.return_loads WHERE operator_id = public.get_auth_operator_id()));

-- 7. Spatial and B-Tree Indexes
CREATE INDEX idx_return_loads_pickup ON public.return_loads USING GIST (pickup_location);
CREATE INDEX idx_return_loads_delivery ON public.return_loads USING GIST (delivery_location);
CREATE INDEX idx_return_loads_operator_scenario ON public.return_loads (operator_id, scenario);
CREATE INDEX idx_rla_route ON public.return_load_assignments (route_id);
CREATE INDEX idx_rla_load ON public.return_load_assignments (return_load_id);
