-- Add is_best_seller flag to products table
-- Set true on a product to display a 🔥 Best Seller badge on the price list
-- Toggled from Analytics → Top Sellers section
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller boolean DEFAULT false;

-- Index for fast lookups when filtering pricelists
CREATE INDEX IF NOT EXISTS idx_products_is_best_seller ON products(user_id, is_best_seller) WHERE is_best_seller = true;
