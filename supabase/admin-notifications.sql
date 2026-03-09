-- =====================================================
-- ADMIN NOTIFICATIONS SYSTEM
-- Run this in Supabase SQL Editor
-- =====================================================

-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('new_customer', 'staff_alert', 'system_alert', 'large_transaction')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error')),
    related_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    related_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON public.admin_notifications(type);

-- Disable RLS for simplicity (admin only access anyway)
ALTER TABLE public.admin_notifications DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNCTION: Create notification for new customer
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_new_customer()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify for new customers (not staff/admin)
    IF NEW.role = 'customer' THEN
        INSERT INTO public.admin_notifications (type, title, message, severity, related_user_id, metadata)
        VALUES (
            'new_customer',
            '新客户注册',
            COALESCE(NEW.full_name, NEW.phone, '未知') || ' 刚刚注册成为会员',
            'info',
            NEW.id,
            jsonb_build_object(
                'customer_name', COALESCE(NEW.full_name, '未知'),
                'phone', NEW.phone,
                'email', NEW.email
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new customer registration
DROP TRIGGER IF EXISTS trigger_notify_new_customer ON public.profiles;
CREATE TRIGGER trigger_notify_new_customer
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_new_customer();

-- =====================================================
-- FUNCTION: Detect suspicious transactions
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_suspicious_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_staff_name TEXT;
    v_customer_name TEXT;
    v_daily_total NUMERIC;
    v_transaction_count INTEGER;
BEGIN
    -- Get staff name
    SELECT full_name INTO v_staff_name FROM public.profiles WHERE id = NEW.staff_id;
    -- Get customer name
    SELECT full_name INTO v_customer_name FROM public.profiles WHERE id = NEW.user_id;
    
    -- Check 1: Large single transaction (over RM500)
    IF NEW.amount > 500 THEN
        INSERT INTO public.admin_notifications (type, title, message, severity, related_user_id, related_staff_id, metadata)
        VALUES (
            'large_transaction',
            '大额交易提醒',
            'Staff ' || COALESCE(v_staff_name, '未知') || ' 为客户 ' || COALESCE(v_customer_name, '未知') || ' 添加了 RM' || NEW.amount || ' 的交易',
            'warning',
            NEW.user_id,
            NEW.staff_id,
            jsonb_build_object(
                'amount', NEW.amount,
                'points', NEW.points,
                'staff_name', v_staff_name,
                'customer_name', v_customer_name
            )
        );
    END IF;
    
    -- Check 2: Staff doing too many transactions in short time (potential abuse)
    SELECT COUNT(*), COALESCE(SUM(amount), 0) 
    INTO v_transaction_count, v_daily_total
    FROM public.transactions 
    WHERE staff_id = NEW.staff_id 
    AND created_at > NOW() - INTERVAL '1 hour';
    
    -- If staff did more than 20 transactions in 1 hour, alert
    IF v_transaction_count > 20 THEN
        INSERT INTO public.admin_notifications (type, title, message, severity, related_staff_id, metadata)
        VALUES (
            'staff_alert',
            'Staff 操作频繁',
            'Staff ' || COALESCE(v_staff_name, '未知') || ' 在过去1小时内进行了 ' || v_transaction_count || ' 笔交易，总额 RM' || v_daily_total,
            'warning',
            NEW.staff_id,
            jsonb_build_object(
                'transaction_count', v_transaction_count,
                'total_amount', v_daily_total,
                'staff_name', v_staff_name
            )
        );
    END IF;
    
    -- Check 3: Same customer getting points multiple times in short period
    SELECT COUNT(*) INTO v_transaction_count
    FROM public.transactions 
    WHERE user_id = NEW.user_id 
    AND created_at > NOW() - INTERVAL '30 minutes';
    
    IF v_transaction_count > 3 THEN
        INSERT INTO public.admin_notifications (type, title, message, severity, related_user_id, related_staff_id, metadata)
        VALUES (
            'system_alert',
            '客户重复获积分',
            '客户 ' || COALESCE(v_customer_name, '未知') || ' 在30分钟内获得了 ' || v_transaction_count || ' 次积分',
            'warning',
            NEW.user_id,
            NEW.staff_id,
            jsonb_build_object(
                'transaction_count', v_transaction_count,
                'customer_name', v_customer_name
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for suspicious transactions
DROP TRIGGER IF EXISTS trigger_notify_suspicious_transaction ON public.transactions;
CREATE TRIGGER trigger_notify_suspicious_transaction
    AFTER INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_suspicious_transaction();

-- =====================================================
-- Clean up old notifications (keep last 30 days)
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM public.admin_notifications 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PASSWORD RESET OTP TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.password_reset_otp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL UNIQUE,
    otp TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_otp_phone ON public.password_reset_otp(phone);

-- Disable RLS
ALTER TABLE public.password_reset_otp DISABLE ROW LEVEL SECURITY;

-- Auto cleanup expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM public.password_reset_otp 
    WHERE expires_at < NOW() OR used = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
