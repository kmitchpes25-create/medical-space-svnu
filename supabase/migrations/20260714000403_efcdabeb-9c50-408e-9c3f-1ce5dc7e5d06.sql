
ALTER TABLE public.lectures
  ADD COLUMN IF NOT EXISTS lecture_summary_link TEXT,
  ADD COLUMN IF NOT EXISTS lecture_transcript_link TEXT;

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings readable by all" ON public.app_settings;
CREATE POLICY "settings readable by all" ON public.app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "settings writable by admin" ON public.app_settings;
CREATE POLICY "settings writable by admin" ON public.app_settings FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.app_settings(key, value) VALUES ('telegram_channel_link', '')
  ON CONFLICT (key) DO NOTHING;
