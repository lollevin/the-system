-- Customer Survey & Voucher
-- Stores admin survey configuration in global_settings and customer answers in
-- survey_responses. Voucher issuing is handled server-side by the app API.

CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE SET NULL,
  survey_version TEXT NOT NULL DEFAULT 'default',
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, survey_version)
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_user_id
  ON public.survey_responses(user_id);

CREATE INDEX IF NOT EXISTS idx_survey_responses_submitted_at
  ON public.survey_responses(submitted_at DESC);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own survey responses" ON public.survey_responses;
CREATE POLICY "Customers can view own survey responses" ON public.survey_responses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all survey responses" ON public.survey_responses;
CREATE POLICY "Admins can view all survey responses" ON public.survey_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage all survey responses" ON public.survey_responses;
CREATE POLICY "Admins can manage all survey responses" ON public.survey_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

INSERT INTO public.global_settings (key, value)
VALUES (
  'survey_config',
  '{
    "enabled": false,
    "title": "Tell us what you like",
    "description": "Complete this quick survey and receive a voucher.",
    "voucher_id": "",
    "survey_version": "default",
    "questions": [
      {
        "id": "favorite_food",
        "prompt": "What food type do you like most?",
        "options": ["Coffee", "Cake", "Burger", "Rice Bowl"]
      },
      {
        "id": "visit_reason",
        "prompt": "Why do you usually visit us?",
        "options": ["Meal", "Coffee break", "Dessert", "Meet friends"]
      }
    ]
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
