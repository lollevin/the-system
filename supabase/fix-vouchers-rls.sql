-- Fix voucher permissions for staff
-- Run this in Supabase SQL Editor

-- 1. Disable RLS on all relevant tables (for testing)
ALTER TABLE public.user_vouchers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Grant full access to authenticated users
GRANT ALL ON public.user_vouchers TO authenticated;
GRANT ALL ON public.vouchers TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- 3. Also grant to anon for PWA access
GRANT SELECT ON public.user_vouchers TO anon;
GRANT SELECT ON public.vouchers TO anon;
GRANT SELECT ON public.profiles TO anon;

-- 4. Check if there are any user_vouchers in the system
SELECT 
  uv.id,
  uv.code,
  uv.is_used,
  uv.expires_at,
  uv.created_at,
  v.name as voucher_name,
  p.full_name as customer_name
FROM user_vouchers uv
LEFT JOIN vouchers v ON uv.voucher_id = v.id
LEFT JOIN profiles p ON uv.user_id = p.id
ORDER BY uv.created_at DESC
LIMIT 10;

-- 5. Check all vouchers (master codes)
SELECT 
  id,
  code,
  name,
  is_active,
  valid_until,
  created_at
FROM vouchers
ORDER BY created_at DESC
LIMIT 10;
