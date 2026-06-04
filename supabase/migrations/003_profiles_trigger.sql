-- Migration: Profiles table enhancement — trigger, RLS, bonus_balance
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. Add bonus_balance column if not exists
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bonus_balance'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN bonus_balance INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================================
-- 2. Create auto-profile trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, bonus_balance, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    100,
    'client'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. Create trigger on auth.users
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. Enable RLS on profiles
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS Policies (drop first to make idempotent)
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow insert for service role" ON public.profiles;
CREATE POLICY "Allow insert for service role"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 6. Ensure loyalty_points has RLS
-- ============================================================
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own loyalty" ON public.loyalty_points;
CREATE POLICY "Users can view own loyalty"
  ON public.loyalty_points FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own loyalty" ON public.loyalty_points;
CREATE POLICY "Users can update own loyalty"
  ON public.loyalty_points FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow insert for service role on loyalty" ON public.loyalty_points;
CREATE POLICY "Allow insert for service role on loyalty"
  ON public.loyalty_points FOR INSERT
  WITH CHECK (true);