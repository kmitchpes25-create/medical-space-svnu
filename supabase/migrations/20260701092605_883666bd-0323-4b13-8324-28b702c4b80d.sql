
-- 1) Change question FKs so deletes cascade properly
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_subject_id_fkey;
ALTER TABLE public.questions ADD CONSTRAINT questions_subject_id_fkey
  FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;

ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_section_id_fkey;
ALTER TABLE public.questions ADD CONSTRAINT questions_section_id_fkey
  FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE CASCADE;

ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_lecture_id_fkey;
ALTER TABLE public.questions ADD CONSTRAINT questions_lecture_id_fkey
  FOREIGN KEY (lecture_id) REFERENCES public.lectures(id) ON DELETE CASCADE;

ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_chapter_id_fkey;
ALTER TABLE public.questions ADD CONSTRAINT questions_chapter_id_fkey
  FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;

-- 2) Hard-delete RPC (relies on ON DELETE CASCADE FKs)
CREATE OR REPLACE FUNCTION public.admin_hard_delete(_table text, _id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _table NOT IN ('academic_years','semesters','subjects','sections','lectures','questions','chapters') THEN
    RAISE EXCEPTION 'invalid table %', _table;
  END IF;
  EXECUTE format('DELETE FROM public.%I WHERE id = $1', _table) USING _id;
END $$;

-- 3) Wipe all existing questions (choices cascade automatically)
DELETE FROM public.questions;
