import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Loader2, Play, Trash2, Target } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/mistakes")({
  component: MistakesQuizPage,
});

type MistakeRow = {
  id: string;
  question_id: string;
  question_text: string;
  correct_answer: string;
  wrong_answer: string;
  created_at: string;
};

function MistakesQuizPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<MistakeRow[]>({
    queryKey: ["mistakes_all"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase
        .from("mistakes")
        .select("id, question_id, question_text, correct_answer, wrong_answer, created_at")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any) || [];
    },
  });

  const mistakes = data || [];

  const start = () => {
    if (!mistakes.length) return;
    const ids = mistakes.map((m) => m.question_id);
    sessionStorage.setItem("quiz_ids", JSON.stringify(ids));
    sessionStorage.setItem("quiz_meta", JSON.stringify({ title: "Mistakes Quiz" }));
    navigate({ to: "/app/quiz" });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("mistakes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removed from Mistakes Quiz");
    qc.invalidateQueries({ queryKey: ["mistakes_all"] });
  };

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Target className="h-6 w-6 text-primary" /> Mistakes Quiz
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Retry the questions you got wrong. Add more from any quiz.
          </p>
        </div>
        <button
          onClick={start}
          disabled={!mistakes.length}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Play className="h-4 w-4" /> Start Quiz ({mistakes.length})
        </button>
      </div>

      {isLoading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !mistakes.length ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No mistakes yet. When you get a question wrong in a quiz, tap "Add to Mistakes Quiz" to save it here.
        </div>
      ) : (
        <div className="space-y-3">
          {mistakes.map((m) => (
            <div key={m.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="flex-1 text-sm font-medium">{m.question_text}</p>
                <button
                  onClick={() => remove(m.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Remove from Mistakes Quiz"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2">
                  <div className="font-semibold text-destructive">Your answer</div>
                  <div className="mt-0.5 text-foreground/80">{m.wrong_answer}</div>
                </div>
                <div className="rounded-lg border border-success/30 bg-success/5 p-2">
                  <div className="font-semibold text-success">Correct answer</div>
                  <div className="mt-0.5 text-foreground/80">{m.correct_answer}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
