-- Add image_url column to vouchers table for "Voucher with Image" feature
-- Allows admins to attach a beautiful image to each voucher/reward

ALTER TABLE vouchers
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add a comment
COMMENT ON COLUMN vouchers.image_url IS 'Optional image URL to display on the voucher card for visual appeal';
