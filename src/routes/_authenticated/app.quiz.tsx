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
interface QData { id: string; text: string; explanation: string | null; question_type: string; choices: QChoice[] }

function QuizPage() {
  const navigate = useNavigate();
  const [ids, setIds] = useState<string[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
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
        .select("id, text, explanation, question_type, choices(id, text, is_correct, order_index)")
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

  const toggle = (cid: string) => {
    setAnswers(prev => {
      const cur = prev[q.id] || [];
      if (isMulti) {
        return { ...prev, [q.id]: cur.includes(cid) ? cur.filter(x => x !== cid) : [...cur, cid] };
      }
      return { ...prev, [q.id]: [cid] };
    });
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");

      let correctCount = 0;
      const answerRows = questions.map(qq => {
        const sel = answers[qq.id] || [];
        const correctIds = qq.choices.filter(c => c.is_correct).map(c => c.id).sort();
        const selSorted = [...sel].sort();
        const ok = correctIds.length === selSorted.length && correctIds.every((v, i) => v === selSorted[i]);
        if (ok) correctCount++;
        return { question_id: qq.id, selected_choice_ids: sel, is_correct: ok };
      });

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
        <p className="text-base font-medium leading-relaxed">{q.text}</p>
        <div className="mt-6 space-y-2">
          {q.choices.map((c, i) => {
            const isSel = selected.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${isSel ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-accent"}`}
              >
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold ${isSel ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{c.text}</span>
                {isSel && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
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
