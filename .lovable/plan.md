
## Goal
Year → Module → Subject → Section → Lecture → Questions, fully admin-managed, no hardcoded structure.

## Migration strategy (no data loss)
The existing `semesters` table will be renamed to `modules` (it already has `year_id`, `name`, `order_index` — perfect fit). Existing `subjects.semester_id` becomes `subjects.module_id` via column rename. Existing data (years, modules, subjects, questions) preserved as-is.

**Lectures**: drop the Chapter layer. Add `lectures.section_id` (FK → sections). Backfill: for each existing lecture, attach to the first section of its chapter's subject; if the subject has no sections yet, auto-create one named "Lectures" (kind=custom). The `chapters` table stays in the schema for now (no destructive drop) but is unused by the new UI.

**Soft delete**: add `deleted_at TIMESTAMPTZ NULL` to years, modules, subjects, sections, lectures, questions. All student-facing RLS / queries filter `deleted_at IS NULL`. Admin gets a Recovery page that lists soft-deleted rows and can restore.

**Question reuse**: new junction `question_lectures (question_id, lecture_id, order_index)`. Existing `questions.lecture_id/section_id/chapter_id` kept for compatibility and backfilled into the junction. Quiz queries read through the junction so a single question can live in many lectures. Edits to the source question propagate automatically (single row).

**Indexes**: composite indexes on (parent_id, order_index, deleted_at) for every level + (lecture_id) on the junction.

## Database changes (one migration)
1. Rename `semesters` → `modules`; rename `subjects.semester_id` → `module_id`.
2. Add `deleted_at` + index to years, modules, subjects, sections, lectures, questions.
3. Add `lectures.section_id` FK, backfill, then make sections the primary parent.
4. Create `question_lectures` junction with RLS + grants; backfill from existing `questions.lecture_id`.
5. Update all RLS SELECT policies to exclude `deleted_at IS NOT NULL` for non-admins.
6. Admin RPCs: `soft_delete(table, id)`, `restore(table, id)`, `reorder(table, ids[])`, `move_node(table, id, new_parent_id)` — all `SECURITY DEFINER` + `is_admin()` guard.

## Admin UI (rebuild `/admin/content`)
Single tree view with collapsible nodes Year → Module → Subject → Section → Lecture. Each row:
- inline rename, add child, move (to new parent picker), soft delete, restore
- drag handle for reordering siblings (uses `@dnd-kit/sortable` — already a common dep; add if missing)
- "Add custom section" allows any name (kind defaults to `custom`)

Bulk actions on questions: move between lectures, bulk delete, bulk attach to additional lectures (reuse).

New `/admin/recovery` page: tabs per entity, list deleted rows with timestamp, "Restore" button.

## Upload & AI extraction
`/admin/upload` and the AI extractor get four cascading selectors: Year → Module → Subject → Section → Lecture. Extracted/imported questions are inserted once and linked to the chosen lecture via `question_lectures`. All existing upload flow preserved.

## Student UI
`/app` lists years → expand to modules → subjects.
Subject page: dynamic list of sections (whatever the admin created — Question Bank, Formative, OSPE, custom). Each section expands to its lectures. Tap lecture → quiz.
Old hardcoded `sectionCards` array is removed.

## Question management
Questions page (admin): filter by Year/Module/Subject/Section/Lecture. Add/edit/delete/move/bulk-delete. "Link to additional lectures" multi-select for reuse. Single Choice / Multiple Choice / True-False already supported by existing `question_type`.

## Permissions
All write RPCs gated by `is_admin()`. RLS already enforces admin-only mutations on the hierarchy tables; student reads filter soft-deletes.

## Files touched (approx.)
- `supabase/migrations/<ts>_flexible_hierarchy.sql` (large)
- `src/routes/_authenticated/admin/content.tsx` (full rewrite — tree + drag-drop)
- `src/routes/_authenticated/admin/recovery.tsx` (new)
- `src/routes/_authenticated/admin/questions.tsx` (filters + bulk move/link)
- `src/routes/_authenticated/admin/upload.tsx` (5-level destination picker)
- `src/routes/_authenticated/app.index.tsx` (Year → Module → Subject browser)
- `src/routes/_authenticated/app.subject.$subjectId.tsx` (dynamic sections, no hardcoded array)
- `src/routes/_authenticated/app.quiz.tsx` (read via question_lectures)
- `src/lib/extract.functions.ts` (accept lecture_id, write junction)
- `src/components/admin-shell.tsx` (Recovery link)
- `package.json` (+ `@dnd-kit/core`, `@dnd-kit/sortable`)

## Risks / notes
- Renaming `semesters` → `modules` breaks any code currently selecting from `semesters`. All such references will be updated in the same pass.
- Backfilling lectures into a synthetic "Lectures" section means existing student URLs to chapter-based quizzes will still work via legacy fields, but the chapter UI is removed.
- This is a large change in one delivery as you requested; I'll batch file edits in parallel to minimize turnarounds, but expect several build cycles before it's clean.

Approve to proceed.
