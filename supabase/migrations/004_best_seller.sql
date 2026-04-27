-- Add is_best_seller flag to products
-- When true, the product gets a 🔥 Best Seller badge on the public price list
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller boolean DEFAULT false;

-- Index for fast filtering on price list
CREATE INDEX IF NOT EXISTS idx_products_best_seller ON products(user_id, is_best_seller) WHERE is_best_seller = true;
