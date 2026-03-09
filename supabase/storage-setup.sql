-- =====================================================
-- SUPABASE STORAGE SETUP FOR JP&Co
-- Run this in Supabase SQL Editor
-- =====================================================

-- Create the 'uploads' bucket for storing images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,  -- Public bucket (images can be viewed by anyone)
  5242880,  -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Allow public read access to uploaded files
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT
USING (bucket_id = 'uploads');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- Allow authenticated users to update their files
CREATE POLICY "Authenticated Update" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'uploads');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated Delete" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'uploads');

-- =====================================================
-- ALTERNATIVE: Manual Setup in Supabase Dashboard
-- =====================================================
-- If the SQL above doesn't work, you can manually:
-- 
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New bucket"
-- 3. Name: "uploads"
-- 4. Check "Public bucket"
-- 5. Click "Create bucket"
-- 6. Go to bucket settings > Policies
-- 7. Add policies for SELECT (public), INSERT/UPDATE/DELETE (authenticated)
-- =====================================================
