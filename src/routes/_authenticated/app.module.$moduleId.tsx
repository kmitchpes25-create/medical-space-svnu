import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/module/$moduleId")({
  component: ModulePage,
});

function ModulePage() {
  const { moduleId } = Route.useParams();

  const { data: mod, isLoading } = useQuery({
    queryKey: ["module_subjects", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("semesters")
        .select("id, name, year_id, academic_years(id, name), subjects(id, name, order_index, deleted_at)")
        .eq("id", moduleId)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const subjects = (((mod as any)?.subjects as any[]) || [])
    .filter((s) => !s.deleted_at)
    .sort((a, b) => a.order_index - b.order_index);
  const yearId = (mod as any)?.year_id;
  const yearName = (mod as any)?.academic_years?.name;

  return (
    <AppShell>
      {yearId ? (
        <Link to="/app/year/$yearId" params={{ yearId }} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary">
          <ChevronLeft className="h-4 w-4" /> Back to {yearName || "year"}
        </Link>
      ) : (
        <Link to="/app" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary">
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold neon-text">{(mod as any)?.name || "Module"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subjects.length} subject{subjects.length === 1 ? "" : "s"}</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-card" />)}
        </div>
      ) : subjects.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border/60 bg-background/30 p-12 text-center">
          <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
            <BookOpen className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold">No subjects yet</p>
          <p className="mt-1 text-xs text-muted-foreground">An admin can add subjects from the admin panel.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((sub: any) => (
            <Link
              key={sub.id}
              to="/app/subject/$subjectId"
              params={{ subjectId: sub.id }}
              className="group glass hover-lift animate-fade-in flex items-center gap-3 rounded-2xl border border-border/60 p-5 shadow-elegant transition-all duration-300 hover:border-primary/60 hover:shadow-glow"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary shadow-glow">
                <BookOpen className="h-6 w-6" />
              </div>
              <span className="min-w-0 flex-1 truncate text-base font-semibold">{sub.name}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
