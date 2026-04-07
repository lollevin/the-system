-- ============================================
-- JP&Co 原子操作函数 (防止竞态条件)
-- ============================================
-- 在 Supabase SQL Editor 中运行此文件
-- 所有积分操作都在数据库事务中完成，保证原子性

-- ============================================
-- 1. 添加积分 (原子操作)
-- ============================================
CREATE OR REPLACE FUNCTION public.add_points_atomic(
  p_user_id UUID,
  p_amount DECIMAL,
  p_reason TEXT,
  p_staff_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_points INTEGER;
  v_new_balance INTEGER;
  v_user_exists BOOLEAN;
BEGIN
  -- 计算积分 (1 RM = 1 积分)
  v_points := FLOOR(p_amount);
  
  -- 检查用户是否存在
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_user_exists;
  IF NOT v_user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- 插入交易记录
  INSERT INTO public.transactions (user_id, staff_id, type, points, amount, reason)
  VALUES (p_user_id, p_staff_id, 'earn', v_points, p_amount, p_reason);
  
  -- 原子更新用户积分（直接 +，不先读取）
  UPDATE public.profiles
  SET 
    points_balance = points_balance + v_points,
    total_spent = total_spent + p_amount,
    visit_count = visit_count + 1,
    last_visit = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING points_balance INTO v_new_balance;
  
  RETURN jsonb_build_object(
    'success', true,
    'points', v_points,
    'newBalance', v_new_balance
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. 扣除积分 (原子操作，用于调整)
-- ============================================
CREATE OR REPLACE FUNCTION public.deduct_points_atomic(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_staff_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- 获取当前余额并锁定行
  SELECT points_balance INTO v_current_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  IF v_current_balance < p_points THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points');
  END IF;
  
  -- 插入交易记录
  INSERT INTO public.transactions (user_id, staff_id, type, points, reason)
  VALUES (p_user_id, p_staff_id, 'adjust', -p_points, p_reason);
  
  -- 原子更新
  UPDATE public.profiles
  SET 
    points_balance = points_balance - p_points,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING points_balance INTO v_new_balance;
  
  RETURN jsonb_build_object(
    'success', true,
    'deducted', p_points,
    'newBalance', v_new_balance
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. 兑换优惠券 (原子操作 + 事务)
-- ============================================
CREATE OR REPLACE FUNCTION public.redeem_voucher_atomic(
  p_user_id UUID,
  p_voucher_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_voucher RECORD;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_voucher_code TEXT;
BEGIN
  -- 获取优惠券信息
  SELECT * INTO v_voucher
  FROM public.vouchers
  WHERE id = p_voucher_id;
  
  IF v_voucher IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voucher not found');
  END IF;
  
  IF NOT v_voucher.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voucher is not active');
  END IF;
  
  IF v_voucher.valid_until < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voucher has expired');
  END IF;
  
  -- 获取用户余额并锁定行（防止并发）
  SELECT points_balance INTO v_current_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  IF v_current_balance < v_voucher.points_required THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points');
  END IF;
  
  -- 生成唯一的用户优惠券码
  v_voucher_code := UPPER(v_voucher.code || '-' || SUBSTRING(p_user_id::text FROM 1 FOR 8) || '-' || TO_CHAR(NOW(), 'MMDD'));
  
  -- 创建用户优惠券记录
  INSERT INTO public.user_vouchers (user_id, voucher_id, code, expires_at)
  VALUES (
    p_user_id, 
    p_voucher_id, 
    v_voucher_code,
    COALESCE(v_voucher.valid_until, NOW() + INTERVAL '30 days')
  );
  
  -- 插入交易记录
  INSERT INTO public.transactions (user_id, type, points, reason)
  VALUES (p_user_id, 'redeem', v_voucher.points_required, 'Redeemed: ' || v_voucher.name);
  
  -- 原子扣除积分
  UPDATE public.profiles
  SET 
    points_balance = points_balance - v_voucher.points_required,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING points_balance INTO v_new_balance;
  
  -- 更新优惠券使用次数
  UPDATE public.vouchers
  SET uses_count = uses_count + 1
  WHERE id = p_voucher_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'voucher', v_voucher.name,
    'voucherCode', v_voucher_code,
    'pointsUsed', v_voucher.points_required,
    'newBalance', v_new_balance
  );
  
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'You already have this voucher');
WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. 使用优惠券 (Staff 标记为已用)
-- ============================================
CREATE OR REPLACE FUNCTION public.use_voucher_atomic(
  p_voucher_code TEXT,
  p_staff_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_user_voucher RECORD;
BEGIN
  -- 查找并锁定用户优惠券
  SELECT uv.*, v.name as voucher_name
  INTO v_user_voucher
  FROM public.user_vouchers uv
  JOIN public.vouchers v ON v.id = uv.voucher_id
  WHERE uv.code = p_voucher_code
  FOR UPDATE;
  
  IF v_user_voucher IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voucher code not found');
  END IF;
  
  IF v_user_voucher.is_used THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voucher already used');
  END IF;
  
  IF v_user_voucher.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voucher has expired');
  END IF;
  
  -- 标记为已使用
  UPDATE public.user_vouchers
  SET 
    is_used = true,
    used_at = NOW(),
    used_by_staff_id = p_staff_id
  WHERE id = v_user_voucher.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'voucher', v_user_voucher.voucher_name,
    'userId', v_user_voucher.user_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ✅ 原子操作函数已创建！
-- ============================================
-- 
-- 使用方法 (TypeScript):
-- const { data } = await supabase.rpc('add_points_atomic', {
--   p_user_id: userId,
--   p_amount: 50.00,
--   p_reason: 'Purchase',
--   p_staff_id: staffId
-- });
