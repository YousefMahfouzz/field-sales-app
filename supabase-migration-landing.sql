-- Landing page featured products (admin picks which products to showcase)
CREATE TABLE IF NOT EXISTS landing_featured (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES auth.users(id),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id)
);

ALTER TABLE landing_featured ENABLE ROW LEVEL SECURITY;

-- Admin can manage
CREATE POLICY "Admin manages landing" ON landing_featured
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Public can read (for landing page)
CREATE POLICY "Public reads landing" ON landing_featured
  FOR SELECT TO anon, authenticated USING (TRUE);

GRANT SELECT ON landing_featured TO anon, authenticated;
GRANT ALL ON landing_featured TO service_role;

-- Price lists (named lists per niche)
CREATE TABLE IF NOT EXISTS price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  niche TEXT, -- 'beauty', 'gas_station', 'convenience', etc.
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lists" ON price_lists FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Public reads active lists" ON price_lists FOR SELECT TO anon USING (is_active = TRUE);
GRANT SELECT ON price_lists TO anon, authenticated;
GRANT ALL ON price_lists TO service_role;

-- Price list items (products in each list with custom prices)
CREATE TABLE IF NOT EXISTS price_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID REFERENCES price_lists(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  custom_price NUMERIC(10,2),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(price_list_id, product_id)
);

ALTER TABLE price_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own list items" ON price_list_items
  FOR ALL USING (EXISTS (SELECT 1 FROM price_lists WHERE id = price_list_id AND user_id = auth.uid()));
CREATE POLICY "Public reads list items" ON price_list_items FOR SELECT TO anon USING (TRUE);
GRANT SELECT ON price_list_items TO anon, authenticated;
GRANT ALL ON price_list_items TO service_role;

-- Index for fast slug lookup
CREATE INDEX IF NOT EXISTS idx_price_lists_slug ON price_lists(user_id, slug);
CREATE INDEX IF NOT EXISTS idx_price_list_items_list ON price_list_items(price_list_id, sort_order);
