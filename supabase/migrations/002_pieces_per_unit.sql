-- Add pieces_per_unit to products table
-- This stores how many individual pieces are in a box/case/pack
-- e.g. A box of honey with 24 sachets → pieces_per_unit = 24
-- Used to calculate and display per-piece pricing on price lists
ALTER TABLE products ADD COLUMN IF NOT EXISTS pieces_per_unit integer;
