-- Migration: Create missing tables for Barakyat Cafe
-- Run this in Supabase SQL Editor

-- 1. Favorites — user's favorite menu items
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  menu_item_id text NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, menu_item_id)
);

-- 2. Delivery zones — geographic delivery areas
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  base_fee numeric DEFAULT 200,
  estimated_minutes integer DEFAULT 30,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. Banquet requests — banquet/event inquiries
CREATE TABLE IF NOT EXISTS public.banquet_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  guests integer NOT NULL DEFAULT 10,
  format text,
  per_person numeric,
  extras text[],
  total_cost numeric,
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. User addresses — saved delivery addresses
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Основной',
  address text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Seed: default delivery zone (Nalchik center)
INSERT INTO public.delivery_zones (name, base_fee, estimated_minutes)
VALUES ('Центр Нальчика', 200, 30)
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_menu_item ON public.favorites(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_banquet_user_id ON public.banquet_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.user_addresses(user_id);
