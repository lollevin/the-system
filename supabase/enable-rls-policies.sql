-- ============================================
-- JP&Co 安全策略 - Row Level Security (RLS)
-- ============================================
-- 在 Supabase SQL Editor 中运行此文件
-- ⚠️ 运行前请确保已备份数据

-- ============================================
-- 1. 启用所有表的 RLS
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vouchers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. 辅助函数：获取当前用户角色
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'customer'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role() IN ('admin', 'staff');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 3. PROFILES 表策略
-- ============================================
-- 删除旧策略
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_staff" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;

-- 用户只能查看自己的资料
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Admin 和 Staff 可以查看所有资料
CREATE POLICY "profiles_select_staff" ON public.profiles
  FOR SELECT USING (public.is_staff_or_admin());

-- 用户只能更新自己的非敏感字段
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND (
      -- 用户不能修改自己的角色、积分余额、总消费
      role = (SELECT role FROM public.profiles WHERE id = auth.uid())
      AND points_balance = (SELECT points_balance FROM public.profiles WHERE id = auth.uid())
      AND total_spent = (SELECT total_spent FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Admin 可以更新任何资料（包括角色）
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- 新用户创建（通过触发器，需要 service role）
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- 4. TRANSACTIONS 表策略
-- ============================================
-- 删除旧策略
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_select_staff" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_disabled" ON public.transactions;

-- 用户只能查看自己的交易记录
CREATE POLICY "transactions_select_own" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Staff 和 Admin 可以查看所有交易
CREATE POLICY "transactions_select_staff" ON public.transactions
  FOR SELECT USING (public.is_staff_or_admin());

-- ⚠️ 禁止客户端直接插入交易记录
-- 所有交易必须通过服务端 RPC 函数 (add_points, redeem_voucher)
-- Staff/Admin 可以通过 RPC 操作
CREATE POLICY "transactions_insert_staff" ON public.transactions
  FOR INSERT WITH CHECK (public.is_staff_or_admin());

-- 禁止任何人直接更新或删除交易记录
-- (不创建 UPDATE/DELETE 策略 = 默认拒绝)

-- ============================================
-- 5. VOUCHERS 表策略
-- ============================================
-- 删除旧策略
DROP POLICY IF EXISTS "vouchers_select_all" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_insert_admin" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_update_admin" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_delete_admin" ON public.vouchers;

-- 所有人可以查看活跃的优惠券
CREATE POLICY "vouchers_select_all" ON public.vouchers
  FOR SELECT USING (is_active = true OR public.is_admin());

-- 只有 Admin 可以增删改优惠券
CREATE POLICY "vouchers_insert_admin" ON public.vouchers
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "vouchers_update_admin" ON public.vouchers
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "vouchers_delete_admin" ON public.vouchers
  FOR DELETE USING (public.is_admin());

-- ============================================
-- 6. USER_VOUCHERS 表策略
-- ============================================
-- 删除旧策略
DROP POLICY IF EXISTS "user_vouchers_select_own" ON public.user_vouchers;
DROP POLICY IF EXISTS "user_vouchers_select_staff" ON public.user_vouchers;
DROP POLICY IF EXISTS "user_vouchers_insert" ON public.user_vouchers;
DROP POLICY IF EXISTS "user_vouchers_update_staff" ON public.user_vouchers;

-- 用户只能查看自己的券
CREATE POLICY "user_vouchers_select_own" ON public.user_vouchers
  FOR SELECT USING (auth.uid() = user_id);

-- Staff 和 Admin 可以查看所有用户券
CREATE POLICY "user_vouchers_select_staff" ON public.user_vouchers
  FOR SELECT USING (public.is_staff_or_admin());

-- 用户可以兑换券（插入记录）- 通过 RPC 函数
CREATE POLICY "user_vouchers_insert" ON public.user_vouchers
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_staff_or_admin());

-- 只有 Staff 可以标记优惠券为已使用
CREATE POLICY "user_vouchers_update_staff" ON public.user_vouchers
  FOR UPDATE USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

-- ============================================
-- 7. MENU_ITEMS 表策略
-- ============================================
DROP POLICY IF EXISTS "menu_items_select_all" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_admin" ON public.menu_items;

-- 所有人可以查看菜单
CREATE POLICY "menu_items_select_all" ON public.menu_items
  FOR SELECT USING (is_active = true OR public.is_admin());

-- 只有 Admin 可以管理菜单
CREATE POLICY "menu_items_admin" ON public.menu_items
  FOR ALL USING (public.is_admin());

-- ============================================
-- 8. AI_CAMPAIGNS 表策略
-- ============================================
DROP POLICY IF EXISTS "ai_campaigns_admin" ON public.ai_campaigns;

-- 只有 Admin 可以管理 AI 营销活动
CREATE POLICY "ai_campaigns_admin" ON public.ai_campaigns
  FOR ALL USING (public.is_admin());

-- ============================================
-- 9. Service Role 绕过策略（用于后端 API）
-- ============================================
-- 注意：使用 service_role key 的请求会自动绕过 RLS
-- 这是正常的，因为后端 API 需要完全访问权限

-- ============================================
-- ✅ RLS 策略已启用！
-- ============================================
-- 
-- 测试步骤：
-- 1. 用普通用户登录，尝试在控制台修改 points_balance
--    预期：被拒绝
-- 2. 用 Admin 登录，修改用户角色
--    预期：成功
-- 3. 用 Staff 登录，查看所有交易记录
--    预期：成功
