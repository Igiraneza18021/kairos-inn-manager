
-- Update is_staff to include all internal roles
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('staff', 'manager', 'owner', 'accountant', 'receptionist')
  )
$$;

-- Helper: is owner or manager (for transactions full access)
CREATE OR REPLACE FUNCTION public.is_owner_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('owner', 'manager')
  )
$$;

-- Update handle_new_user: auto-promote manager@gmail.com to owner, everyone else guest
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  assigned_role app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );

  IF LOWER(NEW.email) = 'manager@gmail.com' THEN
    assigned_role := 'owner';
  ELSE
    assigned_role := 'guest';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- If manager@gmail.com already exists, promote them now
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'owner'::app_role
FROM auth.users u
WHERE LOWER(u.email) = 'manager@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'owner'
  );

-- ROLE PASSKEYS TABLE
CREATE TABLE IF NOT EXISTS public.role_passkeys (
  role app_role PRIMARY KEY,
  passkey text NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_passkeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages passkeys"
ON public.role_passkeys
FOR ALL
USING (has_role(auth.uid(), 'owner'))
WITH CHECK (has_role(auth.uid(), 'owner'));

-- Seed default passkeys (owner can change later)
INSERT INTO public.role_passkeys (role, passkey) VALUES
  ('manager', 'change-me-manager'),
  ('accountant', 'change-me-accountant'),
  ('receptionist', 'change-me-receptionist'),
  ('staff', 'change-me-staff')
ON CONFLICT (role) DO NOTHING;

-- Redeem passkey: signed-in user supplies a passkey and gets the matching role
CREATE OR REPLACE FUNCTION public.redeem_role_passkey(_passkey text)
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  matched_role app_role;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO matched_role
  FROM public.role_passkeys
  WHERE passkey = _passkey
  LIMIT 1;

  IF matched_role IS NULL THEN
    RAISE EXCEPTION 'Invalid passkey';
  END IF;

  -- Owner role cannot be claimed via passkey
  IF matched_role = 'owner' THEN
    RAISE EXCEPTION 'Invalid passkey';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, matched_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN matched_role;
END;
$$;

-- TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric NOT NULL CHECK (amount >= 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'cash',
  description text NOT NULL,
  booking_id uuid,
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_payment_date_idx ON public.transactions(payment_date DESC);
CREATE INDEX IF NOT EXISTS transactions_recorded_by_idx ON public.transactions(recorded_by);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Owner & manager: full access
CREATE POLICY "Owner manager view transactions"
ON public.transactions FOR SELECT
USING (is_owner_or_manager(auth.uid()));

CREATE POLICY "Owner manager update transactions"
ON public.transactions FOR UPDATE
USING (is_owner_or_manager(auth.uid()));

CREATE POLICY "Owner manager delete transactions"
ON public.transactions FOR DELETE
USING (is_owner_or_manager(auth.uid()));

-- Accountant: view all, insert as themselves
CREATE POLICY "Accountant view transactions"
ON public.transactions FOR SELECT
USING (has_role(auth.uid(), 'accountant'));

CREATE POLICY "Accountant insert transactions"
ON public.transactions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'accountant') AND recorded_by = auth.uid());

-- Owner & manager can also insert
CREATE POLICY "Owner manager insert transactions"
ON public.transactions FOR INSERT
WITH CHECK (is_owner_or_manager(auth.uid()) AND recorded_by = auth.uid());

CREATE TRIGGER transactions_touch_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
