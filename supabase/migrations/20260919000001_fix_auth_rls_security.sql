-- CargoSync AI: Step 2.2 Correction
-- Fixes RLS infinite recursion and hardens SECURITY DEFINER functions.

-- 1. Create secure Admin role lookup function
-- Uses SECURITY DEFINER to bypass RLS and avoid infinite recursion.
-- search_path is explicitly set to public to prevent search path hijacking.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'ADMIN'
    );
$$;

-- 2. Harden the existing restrict_profile_updates function
-- Adds explicit search_path and utilizes the new secure is_admin() function.
CREATE OR REPLACE FUNCTION public.restrict_profile_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If the user modifying the row is NOT an Admin
    IF NOT public.is_admin() THEN
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

-- 3. Replace the broken recursive Profiles Admin policy
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin());

-- 4. Replace the broken Operators Admin policy
DROP POLICY IF EXISTS "Admins can manage operators" ON public.operators;

CREATE POLICY "Admins can manage operators"
ON public.operators
FOR ALL
TO authenticated
USING (public.is_admin());
