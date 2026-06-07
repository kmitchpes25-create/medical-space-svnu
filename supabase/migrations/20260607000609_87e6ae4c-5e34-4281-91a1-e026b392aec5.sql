
-- 1) Fix RLS roles for mistakes and user_streaks (restrict to authenticated)
DROP POLICY IF EXISTS "Users manage own mistakes" ON public.mistakes;
CREATE POLICY "mistakes_own_all" ON public.mistakes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own streak" ON public.user_streaks;
DROP POLICY IF EXISTS "Users update own streak" ON public.user_streaks;
DROP POLICY IF EXISTS "Users upsert own streak" ON public.user_streaks;
CREATE POLICY "streaks_own_sel" ON public.user_streaks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "streaks_own_ins" ON public.user_streaks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "streaks_own_upd" ON public.user_streaks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2) Highlights table
CREATE TABLE IF NOT EXISTS public.highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);
GRANT SELECT, INSERT, DELETE ON public.highlights TO authenticated;
GRANT ALL ON public.highlights TO service_role;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "h_own_all" ON public.highlights FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3) Protect choices.is_correct from direct client reads
REVOKE SELECT (is_correct) ON public.choices FROM authenticated;
REVOKE SELECT ON public.choices FROM anon;

-- 4) SECURITY DEFINER RPCs for grading and admin reads
-- Grade a batch of MCQ answers. Returns per-question correctness + correct ids.
CREATE OR REPLACE FUNCTION public.grade_questions(_answers jsonb)
RETURNS TABLE(question_id uuid, is_correct boolean, correct_choice_ids uuid[], correct_text text, explanation text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE r jsonb; qid uuid; sel uuid[]; correct uuid[]; ctext text; expl text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(_answers) LOOP
    qid := (r->>'question_id')::uuid;
    sel := COALESCE(ARRAY(SELECT jsonb_array_elements_text(r->'selected_choice_ids'))::uuid[], ARRAY[]::uuid[]);
    SELECT ARRAY_AGG(c.id ORDER BY c.id),
           string_agg(c.text, ' / ' ORDER BY c.order_index)
      INTO correct, ctext
    FROM public.choices c WHERE c.question_id = qid AND c.is_correct = true;
    SELECT q.explanation INTO expl FROM public.questions q WHERE q.id = qid;
    question_id := qid;
    correct_choice_ids := COALESCE(correct, ARRAY[]::uuid[]);
    correct_text := COALESCE(ctext, '');
    is_correct := (
      COALESCE(array_length(correct,1),0) = COALESCE(array_length(sel,1),0)
      AND COALESCE(correct,ARRAY[]::uuid[]) @> sel
      AND sel @> COALESCE(correct,ARRAY[]::uuid[])
    );
    explanation := expl;
    RETURN NEXT;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.grade_questions(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grade_questions(jsonb) TO authenticated;

-- Admin-only: fetch choices including is_correct
CREATE OR REPLACE FUNCTION public.get_choices_admin(_qids uuid[])
RETURNS TABLE(id uuid, question_id uuid, text text, is_correct boolean, order_index int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.question_id, c.text, c.is_correct, c.order_index
  FROM public.choices c
  WHERE public.is_admin() AND c.question_id = ANY(_qids)
  ORDER BY c.question_id, c.order_index;
$$;
REVOKE ALL ON FUNCTION public.get_choices_admin(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_choices_admin(uuid[]) TO authenticated;

-- 5) Tighten EXECUTE on existing privileged functions
REVOKE EXECUTE ON FUNCTION public.bump_streak() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bump_streak() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
