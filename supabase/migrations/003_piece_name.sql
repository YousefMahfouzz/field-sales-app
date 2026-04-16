-- Add piece_name to products table
-- Stores what each individual item inside a box/case is called
-- e.g. "sachet", "stick", "can", "piece", "packet"
ALTER TABLE products ADD COLUMN IF NOT EXISTS piece_name text;
