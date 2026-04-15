-- Create a table for global app settings (like banners)
CREATE TABLE IF NOT EXISTS public.global_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a default promo banner setting
INSERT INTO public.global_settings (key, value)
VALUES ('promo_banner', '{"imageUrl": "", "link": "/pwa", "isActive": false}')
ON CONFLICT (key) DO NOTHING;

-- Allow anyone to read settings, but only admins can update
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view global settings" ON public.global_settings
    FOR SELECT USING (true);

CREATE POLICY "Only admins can update global settings" ON public.global_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
