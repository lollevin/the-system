-- JP&co Loyalty System - Migration V2
-- 添加生日、事件追踪、消息模板等新功能
-- ⚠️ 在 Supabase SQL Editor 运行此文件来更新现有数据库

-- ============================================
-- 1. 更新 Profiles 表 - 添加新字段
-- ============================================

-- 添加生日字段
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birthday DATE;

-- 添加首选联系方式
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_contact TEXT DEFAULT 'whatsapp' 
CHECK (preferred_contact IN ('whatsapp', 'sms', 'email'));

-- 添加客户标签 (VIP, 常客等)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 添加备注
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================
-- 2. 创建消息模板表
-- ============================================

CREATE TABLE IF NOT EXISTS public.message_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('birthday', 'anniversary', 'churn_risk', 'points_expiry', 'vip_upgrade', 'promotion', 'custom')),
    template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. 创建发送消息记录表
-- ============================================

CREATE TABLE IF NOT EXISTS public.sent_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    message_type TEXT NOT NULL,
    message_content TEXT NOT NULL,
    channel TEXT DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms', 'email')),
    status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    sent_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES public.ai_campaigns(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. 创建定时事件表 (存储检测到的事件)
-- ============================================

CREATE TABLE IF NOT EXISTS public.customer_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('birthday', 'anniversary', 'churn_risk', 'points_expiry', 'vip_upgrade')),
    event_date DATE NOT NULL,
    is_processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    message_sent BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. 创建 Feed Me 数据导入表
-- ============================================

CREATE TABLE IF NOT EXISTS public.pos_imports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    import_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_name TEXT NOT NULL,
    records_count INTEGER DEFAULT 0,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    imported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pos_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    import_id UUID REFERENCES public.pos_imports(id) ON DELETE CASCADE,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    receipt_no TEXT,
    customer_phone TEXT,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    items_count INTEGER,
    payment_method TEXT,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. 创建索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_birthday ON public.profiles(birthday);
CREATE INDEX IF NOT EXISTS idx_profiles_tags ON public.profiles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_sent_messages_customer ON public.sent_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_sent_messages_created ON public.sent_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_events_date ON public.customer_events(event_date);
CREATE INDEX IF NOT EXISTS idx_customer_events_type ON public.customer_events(event_type);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_date ON public.pos_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_phone ON public.pos_transactions(customer_phone);

-- ============================================
-- 7. 禁用 RLS (开发用)
-- ============================================

ALTER TABLE public.message_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_imports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. 插入默认消息模板
-- ============================================

INSERT INTO public.message_templates (name, type, template) VALUES
    ('生日祝福', 'birthday', '🎂 {{name}}，生日快乐！

感谢你成为 JP&Co 的忠实顾客！

为了庆祝你的特别日子，我们送你：
✨ 免费蛋糕一份（今天到店领取）

期待你的光临！🎉
- JP&Co 团队'),

    ('会员周年', 'anniversary', '🎊 {{name}}，恭喜！

今天是你加入 JP&Co 会员满 {{years}} 年的日子！

感谢你一直以来的支持，特送你：
🎁 双倍积分（本周内有效）

我们期待继续为你服务！
- JP&Co 团队'),

    ('流失预警', 'churn_risk', '👋 {{name}}，好久不见！

我们想念你了！已经 {{days}} 天没见到你了。

特别为你准备了：
✨ 回归礼：消费满 RM30 送免费饮料

快来 JP&Co 尝尝我们的新品吧！
- JP&Co 团队'),

    ('积分到期提醒', 'points_expiry', '⏰ {{name}}，积分提醒！

你有 {{points}} 积分即将在 {{expiry_date}} 到期！

别让积分浪费了，快来兑换：
🍔 汉堡折扣券
🍟 免费薯条
🥤 免费饮料

立即到店使用吧！
- JP&Co 团队'),

    ('VIP 升级', 'vip_upgrade', '🌟 恭喜 {{name}}！

你已升级为 {{tier}} 会员！

新等级专属福利：
✨ {{benefits}}

感谢你的支持！继续享受更多优惠吧！
- JP&Co 团队')
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. 创建获取今日事件的函数
-- ============================================

CREATE OR REPLACE FUNCTION public.get_todays_events()
RETURNS TABLE (
    customer_id UUID,
    customer_name TEXT,
    customer_phone TEXT,
    event_type TEXT,
    event_date DATE,
    days_value INTEGER
) AS $$
BEGIN
    -- 生日 (今天或未来7天)
    RETURN QUERY
    SELECT 
        p.id as customer_id,
        p.full_name as customer_name,
        p.phone as customer_phone,
        'birthday'::TEXT as event_type,
        p.birthday as event_date,
        0 as days_value
    FROM public.profiles p
    WHERE p.role = 'customer'
    AND p.birthday IS NOT NULL
    AND (
        (EXTRACT(MONTH FROM p.birthday) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM p.birthday) = EXTRACT(DAY FROM CURRENT_DATE))
        OR
        (EXTRACT(MONTH FROM p.birthday) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '7 days')
        AND EXTRACT(DAY FROM p.birthday) BETWEEN EXTRACT(DAY FROM CURRENT_DATE) AND EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '7 days'))
    );

    -- 会员周年 (今天)
    RETURN QUERY
    SELECT 
        p.id as customer_id,
        p.full_name as customer_name,
        p.phone as customer_phone,
        'anniversary'::TEXT as event_type,
        p.created_at::DATE as event_date,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.created_at::DATE))::INTEGER as days_value
    FROM public.profiles p
    WHERE p.role = 'customer'
    AND EXTRACT(MONTH FROM p.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(DAY FROM p.created_at) = EXTRACT(DAY FROM CURRENT_DATE)
    AND p.created_at::DATE < CURRENT_DATE;

    -- 流失风险 (30天未到店)
    RETURN QUERY
    SELECT 
        p.id as customer_id,
        p.full_name as customer_name,
        p.phone as customer_phone,
        'churn_risk'::TEXT as event_type,
        COALESCE(p.last_visit::DATE, p.created_at::DATE) as event_date,
        EXTRACT(DAY FROM AGE(CURRENT_DATE, COALESCE(p.last_visit, p.created_at)))::INTEGER as days_value
    FROM public.profiles p
    WHERE p.role = 'customer'
    AND (
        p.last_visit IS NULL 
        OR p.last_visit < CURRENT_DATE - INTERVAL '30 days'
    )
    AND p.created_at < CURRENT_DATE - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. 更新 Vouchers 表 - 添加个人/全局类型
-- ============================================

-- 添加优惠券类型 (global=全局, personal=个人)
ALTER TABLE public.vouchers 
ADD COLUMN IF NOT EXISTS voucher_type TEXT DEFAULT 'global' 
CHECK (voucher_type IN ('global', 'personal'));

-- 添加目标客户 (个人优惠券用)
ALTER TABLE public.vouchers 
ADD COLUMN IF NOT EXISTS target_customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 添加 AI 创建标记
ALTER TABLE public.vouchers 
ADD COLUMN IF NOT EXISTS created_by_ai BOOLEAN DEFAULT false;

-- 添加 AI 创建原因
ALTER TABLE public.vouchers 
ADD COLUMN IF NOT EXISTS ai_reason TEXT;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_vouchers_type ON public.vouchers(voucher_type);
CREATE INDEX IF NOT EXISTS idx_vouchers_target ON public.vouchers(target_customer_id);

-- ============================================
-- 11. 创建客户偏好分析表
-- ============================================

CREATE TABLE IF NOT EXISTS public.customer_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    favorite_items TEXT[],
    preferred_visit_time TEXT,
    average_spend DECIMAL(10, 2),
    visit_frequency TEXT,
    last_voucher_used TEXT,
    voucher_usage_count INTEGER DEFAULT 0,
    response_rate DECIMAL(5, 2),
    churn_risk_score INTEGER DEFAULT 0,
    lifetime_value DECIMAL(12, 2) DEFAULT 0,
    ai_notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.customer_preferences DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_customer_prefs ON public.customer_preferences(customer_id);

-- ✅ Migration V2 完成！
-- 
-- 新功能：
-- 1. 客户生日追踪
-- 2. 消息模板系统
-- 3. 发送记录追踪
-- 4. 事件检测系统
-- 5. POS 数据导入
-- 6. 个人/全局优惠券
-- 7. AI 创建优惠券
-- 8. 客户偏好分析
