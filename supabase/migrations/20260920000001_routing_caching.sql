-- 1. ROUTING MATRIX CACHE
CREATE TABLE IF NOT EXISTS public.routing_matrix_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    signature TEXT NOT NULL UNIQUE,
    distances JSONB NOT NULL,
    durations JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_routing_matrix_cache_signature ON public.routing_matrix_cache(signature);

-- 2. ROUTE GEOMETRY CACHE
CREATE TABLE IF NOT EXISTS public.route_geometry_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    signature TEXT NOT NULL UNIQUE,
    distance NUMERIC NOT NULL,
    duration NUMERIC NOT NULL,
    geometry JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_route_geometry_cache_signature ON public.route_geometry_cache(signature);

-- Add explicit RLS policies
ALTER TABLE public.routing_matrix_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_geometry_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow system read access routing_matrix_cache" ON public.routing_matrix_cache FOR SELECT USING (true);
CREATE POLICY "Allow system insert access routing_matrix_cache" ON public.routing_matrix_cache FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow system read access route_geometry_cache" ON public.route_geometry_cache FOR SELECT USING (true);
CREATE POLICY "Allow system insert access route_geometry_cache" ON public.route_geometry_cache FOR INSERT WITH CHECK (true);
