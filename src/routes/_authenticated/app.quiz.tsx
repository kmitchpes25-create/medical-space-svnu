import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/quiz")({
  component: QuizPage,
});

interface QChoice { id: string; text: string; is_correct: boolean; order_index: number }
interface QData { id: string; text: string; explanation: string | null; question_type: string; subject_id?: string | null; chapter_id?: string | null; choices: QChoice[] }

function QuizPage() {
  const navigate = useNavigate();
  const [ids, setIds] = useState<string[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("quiz_ids");
    const m = sessionStorage.getItem("quiz_meta");
    if (!stored) { navigate({ to: "/app" }); return; }
    setIds(JSON.parse(stored));
    setMeta(m ? JSON.parse(m) : null);
  }, [navigate]);

  const { data: questions } = useQuery<QData[]>({
    queryKey: ["quiz_questions", ids],
    queryFn: async () => {
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("questions")
        .select("id, text, explanation, question_type, subject_id, chapter_id, choices(id, text, is_correct, order_index)")
        .in("id", ids);
      if (error) throw error;
      return (data as any[]).map(q => ({ ...q, choices: (q.choices || []).sort((a:any,b:any)=>a.order_index-b.order_index) })) as QData[];
    },
    enabled: ids.length > 0,
  });

  if (!questions) return <AppShell><div className="grid h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div></AppShell>;
  if (!questions.length) return <AppShell><p>No questions.</p></AppShell>;

  const q = questions[idx];
  const selected = answers[q.id] || [];
  const isMulti = q.question_type === "multiple_answers";
  const isWritten = q.question_type === "written";
  const isRevealed = !!revealed[q.id];
  const correctIds = q.choices.filter(c => c.is_correct).map(c => c.id);
  const isCorrect = isWritten
    ? selected.includes("__got_it__")
    : isRevealed && selected.length === correctIds.length && correctIds.every(id => selected.includes(id));

  const toggle = (cid: string) => {
    if (isRevealed) return;
    setAnswers(prev => {
      const cur = prev[q.id] || [];
      if (isMulti) {
        return { ...prev, [q.id]: cur.includes(cid) ? cur.filter(x => x !== cid) : [...cur, cid] };
      }
      const next = { ...prev, [q.id]: [cid] };
      setTimeout(() => setRevealed(r => ({ ...r, [q.id]: true })), 0);
      return next;
    });
  };

  const checkAnswer = () => setRevealed(r => ({ ...r, [q.id]: true }));
  const selfGrade = (gotIt: boolean) => {
    setAnswers(prev => ({ ...prev, [q.id]: gotIt ? ["__got_it__"] : ["__missed__"] }));
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");

      let correctCount = 0;
      const answerRows: any[] = [];
      const mistakeRows: any[] = [];
      for (const qq of questions) {
        const sel = answers[qq.id] || [];
        let ok = false;
        if (qq.question_type === "written") {
          ok = sel.includes("__got_it__");
        } else {
          const cIds = qq.choices.filter(c => c.is_correct).map(c => c.id).sort();
          const selSorted = [...sel].sort();
          ok = cIds.length === selSorted.length && cIds.every((v, i) => v === selSorted[i]);
        }
        if (ok) correctCount++;
        answerRows.push({ question_id: qq.id, selected_choice_ids: sel, is_correct: ok });
        if (!ok && qq.question_type !== "written" && qq.subject_id) {
          const correctTxt = qq.choices.filter(c => c.is_correct).map(c => c.text).join(" / ") || "—";
          const wrongTxt = qq.choices.filter(c => sel.includes(c.id)).map(c => c.text).join(" / ") || "(no answer)";
          mistakeRows.push({
            user_id: u.user.id,
            subject_id: qq.subject_id,
            chapter_id: qq.chapter_id || null,
            question_id: qq.id,
            question_text: qq.text,
            correct_answer: correctTxt,
            wrong_answer: wrongTxt,
          });
        }
      }

      const total = questions.length;
      const pct = total ? (correctCount / total) * 100 : 0;

      const { data: attempt, error } = await supabase.from("exam_attempts").insert({
        user_id: u.user.id,
        title: meta?.title || "Quiz",
        scope: meta,
        total_questions: total,
        correct_count: correctCount,
        score_percent: pct,
        finished_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;

      await supabase.from("exam_answers").insert(answerRows.map(r => ({ ...r, attempt_id: attempt.id })));
      if (mistakeRows.length) {
        await supabase.from("mistakes").upsert(mistakeRows, { onConflict: "user_id,question_id" });
      }

      sessionStorage.removeItem("quiz_ids");
      sessionStorage.removeItem("quiz_meta");
      navigate({ to: "/app/result/$attemptId", params: { attemptId: attempt.id } });
    } catch (err: any) {
      toast.error(err.message);
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{meta?.title || "Quiz"}</p>
          <h1 className="text-xl font-bold">Question {idx + 1} of {questions.length}</h1>
        </div>
        <div className="text-sm text-muted-foreground">{Object.keys(answers).length} / {questions.length} answered</div>
      </div>

      <div className="mb-4 h-1.5 rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((idx+1)/questions.length)*100}%` }} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-base font-medium leading-relaxed whitespace-pre-wrap">{q.text}</p>

        {isWritten ? (
          <div className="mt-6">
            {!isRevealed ? (
              <button onClick={checkAnswer} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Reveal model answer
              </button>
            ) : (
              <>
                <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm whitespace-pre-wrap leading-relaxed">
                  {q.explanation || "No model answer provided."}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">How did you do?</span>
                  <button onClick={() => selfGrade(true)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${selected.includes("__got_it__") ? "border-success bg-success/10 text-success" : "border-border"}`}>
                    Got it right
                  </button>
                  <button onClick={() => selfGrade(false)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${selected.includes("__missed__") ? "border-destructive bg-destructive/10 text-destructive" : "border-border"}`}>
                    Missed it
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-2">
              {q.choices.map((c, i) => {
                const isSel = selected.includes(c.id);
                let cls = "border-border bg-background hover:bg-accent";
                if (isRevealed) {
                  if (c.is_correct) cls = "border-success bg-success/10";
                  else if (isSel) cls = "border-destructive bg-destructive/10";
                  else cls = "border-border bg-background opacity-70";
                } else if (isSel) {
                  cls = "border-primary bg-primary/10";
                }
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    disabled={isRevealed}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${cls}`}
                  >
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold ${isSel && !isRevealed ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{c.text}</span>
                    {isRevealed && c.is_correct && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {isRevealed && isSel && !c.is_correct && <XCircle className="h-4 w-4 text-destructive" />}
                  </button>
                );
              })}
            </div>

            {isRevealed && (
              <div className={`mt-4 rounded-xl border p-4 text-sm ${isCorrect ? "border-success/40 bg-success/5 text-success" : "border-destructive/40 bg-destructive/5 text-destructive"}`}>
                <div className="font-semibold">{isCorrect ? "Correct ✓" : "Incorrect ✗"}</div>
                {q.explanation && <p className="mt-1 text-muted-foreground">{q.explanation}</p>}
              </div>
            )}

            {!isRevealed && isMulti && selected.length > 0 && (
              <button onClick={checkAnswer} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Check answer
              </button>
            )}
          </>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="flex items-center gap-1 rounded-lg border border-border bg-card px-4 py-2 text-sm disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        {idx < questions.length - 1 ? (
          <button
            onClick={() => setIdx(i => i + 1)}
            className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-lg bg-success px-6 py-2 text-sm font-semibold text-success-foreground disabled:opacity-50"
          >
            {submitting ? "..." : "Submit exam"}
          </button>
        )}
      </div>
    </AppShell>
  );
}
