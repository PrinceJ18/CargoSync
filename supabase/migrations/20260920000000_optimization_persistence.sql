-- CargoSync AI: Step 3.18B Optimization Persistence

-- 1. ENUMS
CREATE TYPE optimization_status AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED');
CREATE TYPE optimized_route_stop_type AS ENUM ('DEPOT_START', 'ORDER', 'RETURN_PICKUP', 'RETURN_DELIVERY', 'DEPOT_END');

-- 2. OPTIMIZATION_RUNS Table
CREATE TABLE public.optimization_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID REFERENCES public.operators(id) ON DELETE SET NULL,
    scenario TEXT NOT NULL DEFAULT 'DEMO',
    status optimization_status NOT NULL DEFAULT 'PENDING',
    solver_status TEXT,
    config_snapshot JSONB NOT NULL,
    diagnostics JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    baseline_distance_meters NUMERIC,
    baseline_duration_seconds NUMERIC,
    baseline_vehicles_used INTEGER,
    
    optimized_distance_meters NUMERIC,
    optimized_duration_seconds NUMERIC,
    optimized_vehicles_used INTEGER,
    
    comparable_workload_count INTEGER,
    cost_saved_inr NUMERIC,
    co2_saved_kg NUMERIC,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. OPTIMIZED_ROUTES Table
CREATE TABLE public.optimized_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.optimization_runs(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    total_distance_meters NUMERIC NOT NULL,
    total_duration_seconds NUMERIC NOT NULL,
    geometry GEOGRAPHY(LineString, 4326) NOT NULL,
    return_load_id UUID REFERENCES public.return_loads(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. OPTIMIZED_ROUTE_STOPS Table
CREATE TABLE public.optimized_route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES public.optimized_routes(id) ON DELETE CASCADE,
    sequence_index INTEGER NOT NULL,
    stop_type optimized_route_stop_type NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    return_load_id UUID REFERENCES public.return_loads(id) ON DELETE SET NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (route_id, sequence_index)
);

-- Add Foreign Key to return_load_assignments linking to optimization_runs (conceptually promised in step 3.15)
-- We use a foreign key for run_id and route_id in return_load_assignments if the tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'return_load_assignments' AND table_schema = 'public') THEN
        -- Link return_load_assignments to optimization_runs and optimized_routes
        -- Since the return_load schema created run_id and route_id without FKs (deferred for decoupling)
        -- We can now safely add those foreign keys.
        ALTER TABLE public.return_load_assignments
            ADD CONSTRAINT fk_return_load_assignments_run_id
            FOREIGN KEY (run_id) REFERENCES public.optimization_runs(id) ON DELETE CASCADE;
            
        ALTER TABLE public.return_load_assignments
            ADD CONSTRAINT fk_return_load_assignments_route_id
            FOREIGN KEY (route_id) REFERENCES public.optimized_routes(id) ON DELETE CASCADE;
    END IF;
END $$;


-- 5. Enable RLS
ALTER TABLE public.optimization_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimized_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimized_route_stops ENABLE ROW LEVEL SECURITY;

-- 6. Policies: Admins can manage all
CREATE POLICY "Admins can manage all optimization_runs" ON public.optimization_runs FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage all optimized_routes" ON public.optimized_routes FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage all optimized_route_stops" ON public.optimized_route_stops FOR ALL TO authenticated USING (public.is_admin());

-- 7. Policies: Operators can manage their own
CREATE POLICY "Operators can manage own optimization_runs" ON public.optimization_runs FOR ALL TO authenticated 
USING (operator_id = public.get_auth_operator_id()) 
WITH CHECK (operator_id = public.get_auth_operator_id());

-- For child tables, they inherit access through their parent
CREATE POLICY "Operators can manage routes of own runs" ON public.optimized_routes FOR ALL TO authenticated 
USING (run_id IN (SELECT id FROM public.optimization_runs WHERE operator_id = public.get_auth_operator_id()));

CREATE POLICY "Operators can manage stops of own routes" ON public.optimized_route_stops FOR ALL TO authenticated 
USING (route_id IN (SELECT id FROM public.optimized_routes WHERE run_id IN (SELECT id FROM public.optimization_runs WHERE operator_id = public.get_auth_operator_id())));

-- 8. Spatial and B-Tree Indexes
CREATE INDEX idx_optimization_runs_operator_scenario ON public.optimization_runs (operator_id, scenario);
CREATE INDEX idx_optimized_routes_run ON public.optimized_routes (run_id);
CREATE INDEX idx_optimized_routes_vehicle ON public.optimized_routes (vehicle_id);
CREATE INDEX idx_optimized_routes_geometry ON public.optimized_routes USING GIST (geometry);
CREATE INDEX idx_optimized_route_stops_route ON public.optimized_route_stops (route_id);
CREATE INDEX idx_optimized_route_stops_location ON public.optimized_route_stops USING GIST (location);
