import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Star, Trash2, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/highlights")({
  component: HighlightsPage,
});

function HighlightsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["highlights"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase
        .from("highlights")
        .select("id, question_id, created_at, subject:subjects(id,name), chapter:chapters(id,name), question:questions(id,text)")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const remove = async (id: string) => {
    const { error } = await supabase.from("highlights").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["highlights"] }); }
  };

  const review = (questionId: string, subjectName?: string) => {
    sessionStorage.setItem("quiz_ids", JSON.stringify([questionId]));
    sessionStorage.setItem("quiz_meta", JSON.stringify({ title: `Highlight — ${subjectName ?? "Review"}` }));
    navigate({ to: "/app/quiz" });
  };

  // Group by subject -> chapter
  const grouped: Record<string, Record<string, any[]>> = {};
  for (const h of data || []) {
    const subj = (h as any).subject?.name || "Other";
    const chap = (h as any).chapter?.name || "General";
    grouped[subj] ??= {};
    grouped[subj][chap] ??= [];
    grouped[subj][chap].push(h);
  }

  return (
    <AppShell>
      <h1 className="mb-1 flex items-center gap-2 text-3xl font-bold">
        Highlights <Star className="h-6 w-6 fill-warning text-warning" />
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">Questions you've starred for later review.</p>

      {isLoading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !data?.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
          No highlighted questions yet ⭐
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([subj, chaps]) => (
            <section key={subj}>
              <h2 className="mb-3 text-lg font-semibold">{subj}</h2>
              <div className="space-y-4">
                {Object.entries(chaps).map(([chap, items]) => (
                  <div key={chap}>
                    <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{chap}</h3>
                    <div className="space-y-2">
                      {items.map((h: any) => (
                        <div key={h.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4">
                          <p className="flex-1 text-sm leading-relaxed">{h.question?.text || "(question unavailable)"}</p>
                          <div className="flex gap-1">
                            <button onClick={() => review(h.question_id, subj)} title="Review" className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent">
                              <Play className="h-4 w-4 text-primary" />
                            </button>
                            <button onClick={() => remove(h.id)} title="Remove" className="grid h-8 w-8 place-items-center rounded-md text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}
