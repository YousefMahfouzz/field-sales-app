-- Run this in Supabase Dashboard > SQL Editor

-- 1. Homepage featured products
CREATE TABLE IF NOT EXISTS homepage_featured (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE homepage_featured ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read homepage featured" ON homepage_featured;
CREATE POLICY "Public read homepage featured" ON homepage_featured FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admin manage homepage featured" ON homepage_featured;
CREATE POLICY "Admin manage homepage featured" ON homepage_featured FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
GRANT SELECT ON homepage_featured TO anon;
GRANT ALL ON homepage_featured TO authenticated;

-- 2. Niche price lists
CREATE TABLE IF NOT EXISTS niche_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  theme_color TEXT DEFAULT '#2563eb',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE niche_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read niche lists" ON niche_lists;
CREATE POLICY "Public read niche lists" ON niche_lists FOR SELECT TO anon, authenticated USING (is_active = TRUE);
DROP POLICY IF EXISTS "Admin manage niche lists" ON niche_lists;
CREATE POLICY "Admin manage niche lists" ON niche_lists FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
GRANT SELECT ON niche_lists TO anon;
GRANT ALL ON niche_lists TO authenticated;

-- 3. Niche list items
CREATE TABLE IF NOT EXISTS niche_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_list_id UUID REFERENCES niche_lists(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  custom_price NUMERIC(10,2),
  custom_description TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(niche_list_id, product_id)
);
ALTER TABLE niche_list_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read niche items" ON niche_list_items;
CREATE POLICY "Public read niche items" ON niche_list_items FOR SELECT TO anon, authenticated USING (is_active = TRUE);
DROP POLICY IF EXISTS "Admin manage niche items" ON niche_list_items;
CREATE POLICY "Admin manage niche items" ON niche_list_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
GRANT SELECT ON niche_list_items TO anon;
GRANT ALL ON niche_list_items TO authenticated;

-- 4. Seed default niche lists (replace UUID with your admin user ID)
INSERT INTO niche_lists (admin_user_id, name, slug, description, hero_title, hero_subtitle, theme_color)
VALUES
  ('b4412cb7-1e8b-411a-874d-98418bee1738', 'Beauty Supply Stores', 'beauty-supply',
   'Premium products for beauty supply retailers', 'For Beauty Supply Stores',
   'Wholesale pricing on wigs, extensions, cosmetics and more', '#7c3aed'),
  ('b4412cb7-1e8b-411a-874d-98418bee1738', 'Gas Stations & Convenience', 'gas-station',
   'High-margin products for gas stations and convenience stores', 'For Gas Stations & Convenience Stores',
   'Fast-moving consumer goods at competitive wholesale prices', '#f59e0b')
ON CONFLICT (slug) DO NOTHING;
