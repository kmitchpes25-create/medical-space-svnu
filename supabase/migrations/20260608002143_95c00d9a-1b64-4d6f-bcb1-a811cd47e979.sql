
-- 1) Soft-delete columns + indexes
ALTER TABLE public.academic_years ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.semesters      ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.subjects       ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.sections       ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.lectures       ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.questions      ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS academic_years_active_idx ON public.academic_years(order_index) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS semesters_active_idx      ON public.semesters(year_id, order_index) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS subjects_active_idx       ON public.subjects(semester_id, order_index) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS sections_active_idx       ON public.sections(subject_id, order_index) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS lectures_active_idx       ON public.lectures(order_index) WHERE deleted_at IS NULL;

-- 2) Lecture parent move: Section -> Lecture (Chapter becomes optional)
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.sections(id) ON DELETE CASCADE;
ALTER TABLE public.lectures ALTER COLUMN chapter_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS lectures_section_idx ON public.lectures(section_id, order_index) WHERE deleted_at IS NULL;

-- Backfill: every lecture without a section gets attached to a per-subject "Question Bank" section
DO $$
DECLARE
  s_row record;
  new_sec_id uuid;
BEGIN
  FOR s_row IN
    SELECT DISTINCT c.subject_id AS subject_id
    FROM public.chapters c
    JOIN public.lectures l ON l.chapter_id = c.id
    WHERE l.section_id IS NULL
  LOOP
    SELECT id INTO new_sec_id FROM public.sections
      WHERE subject_id = s_row.subject_id AND kind = 'question_bank'
      ORDER BY order_index LIMIT 1;
    IF new_sec_id IS NULL THEN
      INSERT INTO public.sections (subject_id, kind, name, order_index)
        VALUES (s_row.subject_id, 'question_bank', 'Question Bank', 0)
        RETURNING id INTO new_sec_id;
    END IF;
    UPDATE public.lectures SET section_id = new_sec_id
      WHERE section_id IS NULL
        AND chapter_id IN (SELECT id FROM public.chapters WHERE subject_id = s_row.subject_id);
  END LOOP;
END $$;

-- 3) Question reuse junction
CREATE TABLE IF NOT EXISTS public.question_lectures (
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  lecture_id  uuid NOT NULL REFERENCES public.lectures(id)  ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (question_id, lecture_id)
);
CREATE INDEX IF NOT EXISTS question_lectures_lecture_idx ON public.question_lectures(lecture_id, order_index);
GRANT SELECT ON public.question_lectures TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.question_lectures TO authenticated;
GRANT ALL ON public.question_lectures TO service_role;
ALTER TABLE public.question_lectures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ql_read_all" ON public.question_lectures;
CREATE POLICY "ql_read_all" ON public.question_lectures FOR SELECT USING (true);
DROP POLICY IF EXISTS "ql_admin_write" ON public.question_lectures;
CREATE POLICY "ql_admin_write" ON public.question_lectures FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.question_lectures (question_id, lecture_id)
SELECT id, lecture_id FROM public.questions WHERE lecture_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4) Read policies: hide soft-deleted from non-admins
DROP POLICY IF EXISTS "year_read_all" ON public.academic_years;
CREATE POLICY "year_read_all" ON public.academic_years FOR SELECT
  USING (deleted_at IS NULL OR public.is_admin());

DROP POLICY IF EXISTS "sem_read_all" ON public.semesters;
CREATE POLICY "sem_read_all" ON public.semesters FOR SELECT
  USING (deleted_at IS NULL OR public.is_admin());

DROP POLICY IF EXISTS "subj_read_all" ON public.subjects;
CREATE POLICY "subj_read_all" ON public.subjects FOR SELECT
  USING (deleted_at IS NULL OR public.is_admin());

DROP POLICY IF EXISTS "sec_read_all" ON public.sections;
CREATE POLICY "sec_read_all" ON public.sections FOR SELECT
  USING (deleted_at IS NULL OR public.is_admin());

DROP POLICY IF EXISTS "lec_read_all" ON public.lectures;
CREATE POLICY "lec_read_all" ON public.lectures FOR SELECT
  USING (deleted_at IS NULL OR public.is_admin());

DROP POLICY IF EXISTS "q_read_all" ON public.questions;
CREATE POLICY "q_read_all" ON public.questions FOR SELECT
  USING (deleted_at IS NULL OR public.is_admin());

-- 5) Admin helpers
CREATE OR REPLACE FUNCTION public.admin_soft_delete(_table text, _id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _table NOT IN ('academic_years','semesters','subjects','sections','lectures','questions') THEN
    RAISE EXCEPTION 'invalid table %', _table;
  END IF;
  EXECUTE format('UPDATE public.%I SET deleted_at = now() WHERE id = $1', _table) USING _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_soft_delete(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_soft_delete(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_restore(_table text, _id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _table NOT IN ('academic_years','semesters','subjects','sections','lectures','questions') THEN
    RAISE EXCEPTION 'invalid table %', _table;
  END IF;
  EXECUTE format('UPDATE public.%I SET deleted_at = NULL WHERE id = $1', _table) USING _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_restore(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_restore(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reorder(_table text, _ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _table NOT IN ('academic_years','semesters','subjects','sections','lectures') THEN
    RAISE EXCEPTION 'invalid table %', _table;
  END IF;
  IF _ids IS NULL OR array_length(_ids, 1) IS NULL THEN RETURN; END IF;
  FOR i IN 1..array_length(_ids, 1) LOOP
    EXECUTE format('UPDATE public.%I SET order_index = $1 WHERE id = $2', _table) USING i-1, _ids[i];
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_reorder(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reorder(text, uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_move_node(_table text, _id uuid, _new_parent uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE parent_col text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  parent_col := CASE _table
    WHEN 'semesters' THEN 'year_id'
    WHEN 'subjects' THEN 'semester_id'
    WHEN 'sections' THEN 'subject_id'
    WHEN 'lectures' THEN 'section_id'
    ELSE NULL END;
  IF parent_col IS NULL THEN RAISE EXCEPTION 'invalid table %', _table; END IF;
  EXECUTE format('UPDATE public.%I SET %I = $1 WHERE id = $2', _table, parent_col) USING _new_parent, _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_move_node(text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_move_node(text, uuid, uuid) TO authenticated;
