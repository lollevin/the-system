-- =====================================================
-- FIX EXISTING PROFILES (Optional - run if needed)
-- Run this in Supabase SQL Editor
-- =====================================================

-- Clear fake emails and show phone properly
-- Only run if you have existing test users to fix

-- 1. Clear fake @jpco-member.com emails
UPDATE public.profiles
SET email = NULL
WHERE email LIKE '%@jpco-member.com';

-- 2. Verify profiles
SELECT id, full_name, phone, email, role 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- =====================================================
-- NOTE: The schema.sql has been updated with the new 
-- handle_new_user() trigger. If you re-run schema.sql,
-- this fix-profiles.sql is not needed.
-- =====================================================
