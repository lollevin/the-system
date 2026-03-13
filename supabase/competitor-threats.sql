CREATE TABLE IF NOT EXISTS competitor_threats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_key TEXT UNIQUE NOT NULL,
  competitor_name TEXT NOT NULL,
  threat_level TEXT NOT NULL DEFAULT 'orange' CHECK (threat_level IN ('red', 'orange', 'green')),
  reason TEXT,
  deep_analysis TEXT,
  last_analyzed TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE competitor_threats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on competitor_threats"
  ON competitor_threats FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_competitor_threats_key ON competitor_threats(competitor_key);
CREATE INDEX IF NOT EXISTS idx_competitor_threats_level ON competitor_threats(threat_level);
