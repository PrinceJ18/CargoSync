CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
DECLARE v_op_id UUID;
BEGIN
    SELECT id INTO v_op_id FROM public.operators WHERE name = 'Shree Balaji Logistics' LIMIT 1;
    INSERT INTO public.profiles (id, role, operator_id) VALUES (new.id, 'OPERATOR', v_op_id);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
