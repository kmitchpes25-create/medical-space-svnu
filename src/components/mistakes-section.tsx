import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RotateCcw, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

type Mistake = {
  id: string;
  question_id: string;
  question_text: string;
  correct_answer: string;
  wrong_answer: string;
  created_at: string;
};

export function MistakesSection({ subjectId }: { subjectId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Mistake[]>({
    queryKey: ["mistakes", subjectId],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase
        .from("mistakes")
        .select("id, question_id, question_text, correct_answer, wrong_answer, created_at")
        .eq("user_id", u.user.id)
        .eq("subject_id", subjectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any) || [];
    },
  });

  const [active, setActive] = useState<Mistake | null>(null);

  return (
    <section className="mb-10">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <span>😈</span> Mistakes Quiz
      </h2>

      {isLoading ? (
        <div className="grid h-24 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : !data?.length ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No mistakes yet — keep going 💪
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(m => (
            <div key={m.id} className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-medium">{m.question_text}</p>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-destructive">
                  <div className="font-semibold">Your answer</div>
                  <div className="mt-0.5 text-foreground/80">{m.wrong_answer}</div>
                </div>
                <div className="rounded-lg border border-success/30 bg-success/5 p-2 text-success">
                  <div className="font-semibold">Correct answer</div>
                  <div className="mt-0.5 text-foreground/80">{m.correct_answer}</div>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setActive(m)}
                  className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {active && (
        <RetryModal
          mistake={active}
          onClose={() => setActive(null)}
          onSolved={async () => {
            await supabase.from("mistakes").delete().eq("id", active.id);
            toast.success("Nice — removed from mistakes!");
            qc.invalidateQueries({ queryKey: ["mistakes", subjectId] });
            setActive(null);
          }}
        />
      )}
    </section>
  );
}

function RetryModal({ mistake, onClose, onSolved }: { mistake: Mistake; onClose: () => void; onSolved: () => void }) {
  const { data: q, isLoading } = useQuery({
    queryKey: ["retry_q", mistake.question_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("id, text, question_type, choices(id, text, order_index)")
        .eq("id", mistake.question_id)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<{ correct_ids: string[]; is_correct: boolean } | null>(null);
  const choices = (q?.choices || []).slice().sort((a: any, b: any) => a.order_index - b.order_index);

  const pick = async (cid: string) => {
    setPicked(cid);
    const { data, error } = await supabase.rpc("grade_questions", {
      _answers: [{ question_id: mistake.question_id, selected_choice_ids: [cid] }] as any,
    });
    if (error) { toast.error(error.message); return; }
    const r = (data as any[])[0];
    setRevealed({ correct_ids: r?.correct_choice_ids || [], is_correct: !!r?.is_correct });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold">Retry question</h3>
        {isLoading || !q ? (
          <div className="grid h-32 place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <>
            <p className="mt-3 text-sm font-medium">{q.text}</p>
            <div className="mt-4 space-y-2">
              {choices.map((c: any, i: number) => {
                const isCorr = revealed?.correct_ids.includes(c.id);
                let cls = "border-border hover:bg-accent";
                if (revealed) {
                  if (isCorr) cls = "border-success bg-success/10";
                  else if (picked === c.id) cls = "border-destructive bg-destructive/10";
                } else if (picked === c.id) cls = "border-primary bg-primary/10";
                return (
                  <button
                    key={c.id}
                    disabled={!!revealed}
                    onClick={() => pick(c.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm ${cls}`}
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs">{String.fromCharCode(65 + i)}</span>
                    <span className="flex-1">{c.text}</span>
                    {revealed && isCorr && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {revealed && picked === c.id && !isCorr && <XCircle className="h-4 w-4 text-destructive" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-border px-3 py-1.5 text-xs">Close</button>
              {revealed?.is_correct && (
                <button onClick={onSolved} className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-success-foreground">
                  Mark as learned
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
