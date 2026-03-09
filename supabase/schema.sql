-- JP&co Loyalty System Database Schema
-- ⚠️ 这会删除所有数据并重新创建表！
-- 复制全部内容到 Supabase SQL Editor 运行

-- 1. 删除所有旧表
DROP TABLE IF EXISTS public.user_vouchers CASCADE;
DROP TABLE IF EXISTS public.vouchers CASCADE;
DROP TABLE IF EXISTS public.ai_campaigns CASCADE;
DROP TABLE IF EXISTS public.menu_items CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. 删除旧函数和触发器
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.add_points(UUID, DECIMAL, TEXT, UUID) CASCADE;

-- 3. 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 4. 创建表
-- ============================================

-- Profiles 表 (用户资料)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'staff', 'customer')),
    points_balance INTEGER DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    last_visit TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions 表 (积分交易记录)
CREATE TABLE public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'adjust')),
    points INTEGER NOT NULL,
    amount DECIMAL(10, 2),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu Items 表 (菜单)
CREATE TABLE public.menu_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Campaigns 表 (AI 营销活动)
CREATE TABLE public.ai_campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    goal TEXT NOT NULL,
    target_segment TEXT,
    message_template TEXT NOT NULL,
    recipients_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Vouchers 表 (优惠券/奖励)
CREATE TABLE public.vouchers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order DECIMAL(10, 2),
    max_uses INTEGER,
    uses_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    voucher_type TEXT DEFAULT 'global',
    target_customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by_ai BOOLEAN DEFAULT false,
    ai_reason TEXT,
    max_uses_per_customer INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Vouchers 表 (用户兑换的优惠券)
CREATE TABLE public.user_vouchers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    voucher_id UUID REFERENCES public.vouchers(id) ON DELETE CASCADE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    used_by_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. 创建索引
-- ============================================
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_staff_id ON public.transactions(staff_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_user_vouchers_user_id ON public.user_vouchers(user_id);
CREATE INDEX idx_user_vouchers_code ON public.user_vouchers(code);

-- ============================================
-- 6. 禁用 RLS (开发测试用，生产环境建议启用)
-- ============================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vouchers DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. 创建函数和触发器
-- ============================================

-- 自动创建用户 Profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (
        NEW.id, 
        -- Only store real emails, not fake @jpco-member.com ones
        CASE 
            WHEN NEW.email LIKE '%@jpco-member.com' THEN NULL
            ELSE NEW.email
        END,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
        COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
        'customer'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 新用户注册触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 更新 updated_at 时间戳
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 更新触发器
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 添加积分存储过程
CREATE OR REPLACE FUNCTION public.add_points(
    p_user_id UUID,
    p_amount DECIMAL,
    p_reason TEXT,
    p_staff_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_points INTEGER;
    v_result JSON;
BEGIN
    v_points := FLOOR(p_amount);
    
    INSERT INTO public.transactions (user_id, staff_id, type, points, amount, reason)
    VALUES (p_user_id, p_staff_id, 'earn', v_points, p_amount, p_reason);
    
    UPDATE public.profiles
    SET 
        points_balance = points_balance + v_points,
        total_spent = total_spent + p_amount,
        visit_count = visit_count + 1,
        last_visit = NOW()
    WHERE id = p_user_id;
    
    SELECT json_build_object(
        'success', true,
        'points_added', v_points,
        'new_balance', (SELECT points_balance FROM public.profiles WHERE id = p_user_id)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. User Sessions (App Usage Tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ DEFAULT NOW(),
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON public.user_sessions(started_at DESC);

-- RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own sessions" ON public.user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" ON public.user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin and staff can view all sessions" ON public.user_sessions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
    );

-- Service role bypass for API endpoint
CREATE POLICY "Service role full access sessions" ON public.user_sessions
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 9. Staff Activity Log (for Admin Monitoring)
-- ============================================

CREATE TABLE IF NOT EXISTS public.staff_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL, -- 'add_points', 'redeem_voucher', 'lookup_customer'
    target_customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}'::jsonb,
    flagged BOOLEAN DEFAULT false,
    flag_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_activity_staff_id ON public.staff_activity_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_activity_created_at ON public.staff_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_activity_flagged ON public.staff_activity_log(flagged) WHERE flagged = true;

ALTER TABLE public.staff_activity_log ENABLE ROW LEVEL SECURITY;

-- Staff can insert their own activity
CREATE POLICY "Staff can insert own activity" ON public.staff_activity_log
    FOR INSERT WITH CHECK (auth.uid() = staff_id);

-- Admin can view all activity
CREATE POLICY "Admin can view all staff activity" ON public.staff_activity_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Service role full access
CREATE POLICY "Service role full access staff_activity" ON public.staff_activity_log
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 10. Referral System
-- ============================================

-- Add referral_code to profiles (unique short code per user)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Auto-generate referral code on new profile creation
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', '') FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_referral_code ON public.profiles;
CREATE TRIGGER trigger_generate_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();

-- Referral Campaigns (Admin creates these)
CREATE TABLE IF NOT EXISTS public.referral_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    -- Referrer reward
    referrer_reward_type TEXT NOT NULL DEFAULT 'points' CHECK (referrer_reward_type IN ('points', 'voucher')),
    referrer_reward_value INTEGER DEFAULT 0, -- points amount or voucher_id reference
    referrer_voucher_id UUID REFERENCES public.vouchers(id) ON DELETE SET NULL,
    -- Referee reward  
    referee_reward_type TEXT NOT NULL DEFAULT 'points' CHECK (referee_reward_type IN ('points', 'voucher')),
    referee_reward_value INTEGER DEFAULT 0,
    referee_voucher_id UUID REFERENCES public.vouchers(id) ON DELETE SET NULL,
    -- Limits
    max_referrals_per_user INTEGER DEFAULT 0, -- 0 = unlimited
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.referral_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active campaigns" ON public.referral_campaigns
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin full access referral_campaigns" ON public.referral_campaigns
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Referrals (tracks who referred whom)
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES public.referral_campaigns(id) ON DELETE SET NULL,
    referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    referee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'rewarded')),
    referrer_rewarded BOOLEAN DEFAULT false,
    referee_rewarded BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(referrer_id, referee_id) -- prevent duplicate referrals
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON public.referrals(referee_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON public.referrals
    FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "Service can insert referrals" ON public.referrals
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin full access referrals" ON public.referrals
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- 11. Sample Data
-- ============================================

-- 示例优惠券
INSERT INTO public.vouchers (code, name, description, points_required, discount_type, discount_value, valid_until) VALUES
    ('BURGER50', '50% Off Burger', 'Get 50% off any burger', 250, 'percentage', 50, NOW() + INTERVAL '90 days'),
    ('FREEFRIES', 'Free Fries', 'Free regular fries with any burger', 100, 'fixed', 6.90, NOW() + INTERVAL '90 days'),
    ('FREEDRINK', 'Free Drink', 'Free regular drink with any meal', 80, 'fixed', 4.90, NOW() + INTERVAL '90 days'),
    ('COMBO10', '10% Off Combo', 'Get 10% off any combo meal', 50, 'percentage', 10, NOW() + INTERVAL '90 days')
ON CONFLICT (code) DO NOTHING;

-- ✅ 完成！
-- 
-- 接下来：
-- 1. 注册新用户测试
-- 2. 在 Table Editor -> profiles 里手动修改 role 为 'admin' 或 'staff'
-- 3. 用修改后的账户登录测试 admin/staff 页面
