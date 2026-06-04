## Source analysis

PDF contains **92 numbered MCQs** (Pharma past exam 26/25), each with choices `a)`–`f)` and an answer-key table on the last page mapping question → correct letter. No explicit chapter headers in the file, so chapters must be inferred from question topics.

Sample answer key parsed: `1:A, 2:A, 3:A, 4:C, 5:A … 92:B` (full table extracted).

## Plan

### 1. Ensure academic hierarchy
- Insert (if missing): Academic Year **"السنة الأولى / Year 1 Medicine"** → Semester **"الفصل الثاني / Second Semester"** → Subject **"علم الأدوية / Pharmacology"**.
- Ensure a `question_bank` section exists for Pharmacology.

### 2. Parse the PDF locally (Python)
- Regex extract each `**N. stem**` block and its `a)…f)` choices from the parsed markdown.
- Parse the answer-key table into `{questionNumber → correctLetter}`.
- Build a normalized list of 92 question records with stem, choices, and correct index.
- De-duplicate by SHA-256 hash of normalized stem (Q15 ≈ Q4, Q20 ≈ Q13, Q57 ≈ Q25 will collapse).

### 3. Auto-detect chapters via Lovable AI
Single Lovable-AI call (gemini-3-flash) classifies each question into one of the standard Pharma topics:
- Cholinergic System
- Adrenergic System
- Autacoids & Antihistamines
- Cardiovascular Drugs
- Antimicrobials
- Antivirals
- Miscellaneous

Chapters are created on demand; each question is linked to its chapter.

### 4. Insert into database
- Insert chapters (under Pharmacology subject).
- Insert questions (type `mcq`, `source_kind = question_bank`, `subject_id`, `chapter_id`, `hash` for dedup).
- Insert choices (5–6 per question, `is_correct` flag on the keyed letter).

### 5. Generate exams (stored as `exam_attempts` templates? — actually built dynamically)
The platform already supports dynamic quiz creation by filter. So instead of pre-seeding exam rows we'll surface these entry points on `/app/subject/{pharma}`:
- **Question Bank** — browse all 92 questions
- **Random Exam (20 Q)** — random subset, shuffled
- **Chapter Exam** — per detected chapter
- **Full-Subject Exam** — all questions, timed
(If pre-seeded exam templates are needed, a new `exam_templates` table would have to be added — out of scope unless requested.)

### 6. Final summary
After import I'll report:
- Questions imported / duplicates skipped / failures
- Chapters created
- Exam entry points available
- Direct link to the Pharmacology subject page

## Technical details

- Parsing script: `/tmp/parse_pharma.py` (regex over parsed markdown — no AI needed for extraction since format is clean).
- Chapter classification: one batched Lovable-AI call returning JSON `{qnum: chapter_name}`.
- DB writes: via `psql` (already has insert access) wrapped in a single transaction; uses `ON CONFLICT (hash) DO NOTHING` for dedup.
- The uploaded PDF is **not** stored in the `uploads` bucket — only its parsed content becomes DB records, per your request.
- No schema migration required (existing tables suffice; `questions.hash` column already exists).

Shall I proceed?
