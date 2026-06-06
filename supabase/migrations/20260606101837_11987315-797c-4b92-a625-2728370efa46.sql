
-- Mistakes table: tracks wrong answers per user/question
CREATE TABLE public.mistakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  correct_answer text NOT NULL,
  wrong_answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mistakes TO authenticated;
GRANT ALL ON public.mistakes TO service_role;
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mistakes" ON public.mistakes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_mistakes_user_subject ON public.mistakes(user_id, subject_id);

-- User streaks
CREATE TABLE public.user_streaks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak int NOT NULL DEFAULT 1,
  last_login_date date NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_streaks TO authenticated;
GRANT ALL ON public.user_streaks TO service_role;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own streak" ON public.user_streaks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own streak" ON public.user_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own streak" ON public.user_streaks
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RPC to bump streak atomically
CREATE OR REPLACE FUNCTION public.bump_streak()
RETURNS public.user_streaks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  rec public.user_streaks;
  today date := CURRENT_DATE;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO rec FROM public.user_streaks WHERE user_id = uid;
  IF NOT FOUND THEN
    INSERT INTO public.user_streaks(user_id, current_streak, last_login_date)
    VALUES (uid, 1, today) RETURNING * INTO rec;
  ELSIF rec.last_login_date = today THEN
    -- no-op
    NULL;
  ELSIF rec.last_login_date = today - INTERVAL '1 day' THEN
    UPDATE public.user_streaks
      SET current_streak = current_streak + 1, last_login_date = today, updated_at = now()
      WHERE user_id = uid RETURNING * INTO rec;
  ELSE
    UPDATE public.user_streaks
      SET current_streak = 1, last_login_date = today, updated_at = now()
      WHERE user_id = uid RETURNING * INTO rec;
  END IF;
  RETURN rec;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_streak() TO authenticated;
