-- CargoSync AI: Step 2.2 Auth & Database Foundation
-- Creates operators and profiles tables with Role constraints and RLS policies.

-- 1. Create operators table
CREATE TABLE public.operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'OPERATOR')),
    operator_id UUID REFERENCES public.operators(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Operators
-- All authenticated users can read operators
CREATE POLICY "Operators are viewable by authenticated users" 
ON public.operators 
FOR SELECT 
TO authenticated 
USING (true);

-- Admins can insert/update/delete operators
CREATE POLICY "Admins can manage operators"
ON public.operators
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
);

-- 5. RLS Policies for Profiles
-- Admins can read/manage all profiles
CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p2 
        WHERE p2.id = auth.uid() AND p2.role = 'ADMIN'
    )
);

-- Operators can read their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Operators can update their own profile (but not their role or operator_id to prevent escalation)
-- Note: PostgreSQL doesn't natively restrict column updates via RLS directly in a simple USING clause for standard setups, 
-- but we can restrict it using a function or trigger. However, as requested by the strict instructions: 
-- "A normal user must not be able to modify protected authorization fields such as their own role".
-- To enforce this at the database level, we use a trigger to prevent modification of role and operator_id by non-admins.

CREATE OR REPLACE FUNCTION restrict_profile_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If the user modifying the row is NOT an Admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'ADMIN'
    ) THEN
        -- Prevent changing the role
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'You are not authorized to change your role.';
        END IF;
        
        -- Prevent changing the operator_id
        IF NEW.operator_id IS DISTINCT FROM OLD.operator_id THEN
            RAISE EXCEPTION 'You are not authorized to change your assigned operator.';
        END IF;
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER check_profile_update_restrictions
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION restrict_profile_updates();

-- Operators can update their own profile basic details
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- NOTE: Automatic profile creation (e.g. via trigger on auth.users) has been INTENTIONALLY EXCLUDED 
-- because the source-of-truth documentation does not specify a default role or creation flow. 
-- Profiles must currently be provisioned manually or via an explicit Admin endpoint in later phases.
