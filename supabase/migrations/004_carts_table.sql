-- Migration: Carts table for DB-backed cart sync
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. Carts table — one row per user
-- ============================================================
CREATE TABLE IF NOT EXISTS public.carts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delivery_method text DEFAULT 'pickup',
  delivery_address text,
  promo_code text,
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================================
-- 2. Cart items — individual items in a cart
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cart_id uuid NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  menu_item_id text NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  modifiers jsonb DEFAULT '[]'::jsonb,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(cart_id, menu_item_id)
);

-- ============================================================
-- 3. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);

-- ============================================================
-- 4. RLS Policies
-- ============================================================
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own cart
DROP POLICY IF EXISTS "Users can view own cart" ON public.carts;
CREATE POLICY "Users can view own cart"
  ON public.carts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cart" ON public.carts;
CREATE POLICY "Users can insert own cart"
  ON public.carts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cart" ON public.carts;
CREATE POLICY "Users can update own cart"
  ON public.carts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own cart" ON public.carts;
CREATE POLICY "Users can delete own cart"
  ON public.carts FOR DELETE
  USING (auth.uid() = user_id);

-- Cart items inherit from cart RLS (same user ownership)
DROP POLICY IF EXISTS "Users can manage own cart items" ON public.cart_items;
CREATE POLICY "Users can manage own cart items"
  ON public.cart_items FOR ALL
  USING (
    cart_id IN (
      SELECT id FROM public.carts WHERE user_id = auth.uid()
    )
  );
