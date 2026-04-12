-- ============================================================
-- DRIVER / SUB-ACCOUNT SYSTEM MIGRATION
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add missing columns to profiles (parent_user_id and role already exist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_see_profit boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2. Create driver_codes table
CREATE TABLE IF NOT EXISTS driver_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  code text UNIQUE NOT NULL,
  label text,  -- optional: owner can label the code, e.g. "For Ahmad"
  used_by uuid REFERENCES auth.users,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS for driver_codes: owners manage their own codes, drivers can read (to validate during signup)
ALTER TABLE driver_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can check if a code is valid (needed during registration when not yet authenticated)
CREATE POLICY "Anyone can read driver codes" ON driver_codes
  FOR SELECT TO anon, authenticated
  USING (true);

-- Only the owner can insert/update/delete their own codes
CREATE POLICY "Owners manage their driver codes" ON driver_codes
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());


-- 3. Update RLS policies for parent-aware access
-- ─── PRODUCTS ───────────────────────────────────────────────
-- Drop existing restrictive policies (keep the public anon read for active products)
DROP POLICY IF EXISTS "Users manage own products" ON products;
DROP POLICY IF EXISTS "Users and drivers read products" ON products;
DROP POLICY IF EXISTS "Users and drivers manage products" ON products;

-- Owners see their own products; drivers see their parent's products
CREATE POLICY "Users and drivers read products" ON products
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id = (SELECT parent_user_id FROM profiles WHERE id = auth.uid())
  );

-- Only owners can insert/update/delete products (drivers get read-only)
CREATE POLICY "Owners manage products" ON products
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners update products" ON products
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id = (SELECT parent_user_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR user_id = (SELECT parent_user_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Owners delete products" ON products
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ─── CUSTOMERS ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Users manage own customers" ON customers;
DROP POLICY IF EXISTS "Users and drivers manage customers" ON customers;

-- Owners + drivers can read customers belonging to the owner
CREATE POLICY "Users and drivers read customers" ON customers
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id = (SELECT parent_user_id FROM profiles WHERE id = auth.uid())
  );

-- Insert: drivers create customers under the parent's user_id
CREATE POLICY "Users and drivers insert customers" ON customers
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR user_id = (SELECT parent_user_id FROM profiles WHERE id = auth.uid())
  );

-- Update: both owner and driver can update
CREATE POLICY "Users and drivers update customers" ON customers
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id = (SELECT parent_user_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR user_id = (SELECT parent_user_id FROM profiles WHERE id = auth.uid())
  );

-- Delete: both owner and driver can delete
CREATE POLICY "Users and drivers delete customers" ON customers
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id = (SELECT parent_user_id FROM profiles WHERE id = auth.uid())
  );

-- ─── STOCK MOVEMENTS ────────────────────────────────────────
-- Drivers record their own stock_movements but need to read parent's too
DROP POLICY IF EXISTS "Users manage own stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "Users and drivers manage stock_movements" ON stock_movements;

CREATE POLICY "Users and drivers read stock_movements" ON stock_movements
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id = (SELECT parent_user_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users insert own stock_movements" ON stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own stock_movements" ON stock_movements
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own stock_movements" ON stock_movements
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ─── SALE_ITEMS ─────────────────────────────────────────────
-- Owner needs to see all drivers' sale_items for the team dashboard
DROP POLICY IF EXISTS "Users manage own sale_items" ON sale_items;
DROP POLICY IF EXISTS "Users and drivers read sale_items" ON sale_items;

CREATE POLICY "Users and team read sale_items" ON sale_items
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (SELECT id FROM profiles WHERE parent_user_id = auth.uid())
    OR user_id = (SELECT parent_user_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users insert own sale_items" ON sale_items
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own sale_items" ON sale_items
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own sale_items" ON sale_items
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ─── VISITS ─────────────────────────────────────────────────
-- Owner needs to see all drivers' visits for team dashboard
DROP POLICY IF EXISTS "Users manage own visits" ON visits;
DROP POLICY IF EXISTS "Users and drivers read visits" ON visits;

CREATE POLICY "Users and team read visits" ON visits
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (SELECT id FROM profiles WHERE parent_user_id = auth.uid())
    OR user_id = (SELECT parent_user_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users insert own visits" ON visits
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own visits" ON visits
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own visits" ON visits
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ─── PROFILES ───────────────────────────────────────────────
-- Owner needs to read driver profiles; drivers need to read parent profile
-- (Public read already exists for anon/authenticated)
-- Add update policy so owners can toggle driver settings
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Owners update driver profiles" ON profiles;

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Owners update driver profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (parent_user_id = auth.uid())
  WITH CHECK (parent_user_id = auth.uid());

-- ============================================================
-- SET EXISTING USERS AS OWNERS
-- ============================================================
UPDATE profiles SET role = 'owner' WHERE role IS NULL;
UPDATE profiles SET is_active = true WHERE is_active IS NULL;
UPDATE profiles SET can_see_profit = false WHERE can_see_profit IS NULL;

-- Done! 
