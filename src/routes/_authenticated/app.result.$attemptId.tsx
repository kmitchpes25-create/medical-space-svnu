import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { CheckCircle2, XCircle, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/result/$attemptId")({
  component: ResultPage,
});

function ResultPage() {
  const { attemptId } = Route.useParams();

  const { data } = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: async () => {
      const { data: attempt } = await supabase.from("exam_attempts").select("*").eq("id", attemptId).single();
      const { data: answers } = await supabase
        .from("exam_answers")
        .select("*, question:questions(id, text, explanation, choices(id, text, is_correct, order_index))")
        .eq("attempt_id", attemptId);
      return { attempt, answers: answers || [] };
    },
  });

  if (!data?.attempt) return <AppShell>...</AppShell>;
  const a = data.attempt;
  const wrong = a.total_questions - a.correct_count;

  return (
    <AppShell>
      <div className="mb-6 rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-card p-8 text-center shadow-elegant">
        <Trophy className="mx-auto h-12 w-12 text-warning" />
        <h1 className="mt-3 text-3xl font-bold">{a.score_percent.toFixed(1)}%</h1>
        <p className="text-muted-foreground">{a.title}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="text-2xl font-bold">{a.total_questions}</div>
            <div className="text-xs text-muted-foreground">Total questions</div>
          </div>
          <div className="rounded-xl border border-success/30 bg-success/5 p-4">
            <div className="text-2xl font-bold text-success">{a.correct_count}</div>
            <div className="text-xs text-muted-foreground">Correct</div>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="text-2xl font-bold text-destructive">{wrong}</div>
            <div className="text-xs text-muted-foreground">Incorrect</div>
          </div>
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/app" className="rounded-lg border border-border bg-card px-5 py-2 text-sm">Home</Link>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Review</h2>
      <div className="space-y-3">
        {data.answers.map((ans: any, i: number) => {
          const q = ans.question;
          if (!q) return null;
          const choices = (q.choices || []).sort((x:any,y:any)=>x.order_index-y.order_index);
          return (
            <div key={ans.id} className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="font-medium leading-relaxed">{i+1}. {q.text}</p>
                {ans.is_correct
                  ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                  : <XCircle className="h-5 w-5 shrink-0 text-destructive" />}
              </div>
              <div className="space-y-1.5">
                {choices.map((c: any) => {
                  const sel = ans.selected_choice_ids.includes(c.id);
                  return (
                    <div key={c.id} className={`rounded-lg border p-2.5 text-sm ${c.is_correct ? "border-success/40 bg-success/5" : sel ? "border-destructive/40 bg-destructive/5" : "border-border"}`}>
                      {c.text}
                      {c.is_correct && <span className="ml-2 text-xs text-success">✓ Correct answer</span>}
                      {sel && !c.is_correct && <span className="ml-2 text-xs text-destructive">Your answer</span>}
                    </div>
                  );
                })}
              </div>
              {q.explanation && <p className="mt-3 rounded-lg bg-accent/50 p-3 text-xs text-muted-foreground">{q.explanation}</p>}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
