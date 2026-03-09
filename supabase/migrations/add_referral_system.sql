-- ============================================
-- Referral System Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add referral_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 2. Auto-generate referral code trigger
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

-- 3. Generate referral codes for existing users (who don't have one)
UPDATE public.profiles 
SET referral_code = UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- 4. Referral Campaigns table
CREATE TABLE IF NOT EXISTS public.referral_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    referrer_reward_type TEXT NOT NULL DEFAULT 'points' CHECK (referrer_reward_type IN ('points', 'voucher')),
    referrer_reward_value INTEGER DEFAULT 0,
    referrer_voucher_id UUID REFERENCES public.vouchers(id) ON DELETE SET NULL,
    referee_reward_type TEXT NOT NULL DEFAULT 'points' CHECK (referee_reward_type IN ('points', 'voucher')),
    referee_reward_value INTEGER DEFAULT 0,
    referee_voucher_id UUID REFERENCES public.vouchers(id) ON DELETE SET NULL,
    max_referrals_per_user INTEGER DEFAULT 0,
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

-- 5. Referrals tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES public.referral_campaigns(id) ON DELETE SET NULL,
    referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    referee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'rewarded')),
    referrer_rewarded BOOLEAN DEFAULT false,
    referee_rewarded BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(referrer_id, referee_id)
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
