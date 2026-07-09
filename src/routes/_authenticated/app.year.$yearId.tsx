import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { ChevronLeft, ChevronRight, Layers, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/year/$yearId")({
  component: YearPage,
});

function YearPage() {
  const { yearId } = Route.useParams();

  const { data: year, isLoading } = useQuery({
    queryKey: ["year_modules", yearId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_years")
        .select("id, name, semesters(id, name, order_index, deleted_at, subjects(id, deleted_at))")
        .eq("id", yearId)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const modules = ((year?.semesters as any[]) || [])
    .filter((m) => !m.deleted_at)
    .sort((a, b) => a.order_index - b.order_index);

  return (
    <AppShell>
      <Link to="/app" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> Back to years
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold neon-text">{year?.name || "Year"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{modules.length} module{modules.length === 1 ? "" : "s"}</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-card" />)}
        </div>
      ) : modules.length === 0 ? (
        <EmptyState title="No modules yet" hint="An admin can add modules from the admin panel." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod: any) => {
            const subjectCount = ((mod.subjects as any[]) || []).filter((s) => !s.deleted_at).length;
            return (
              <Link
                key={mod.id}
                to="/app/module/$moduleId"
                params={{ moduleId: mod.id }}
                className="group glass hover-lift animate-fade-in flex flex-col justify-between rounded-2xl border border-border/60 p-5 shadow-elegant transition-all duration-300 hover:border-primary/60 hover:shadow-glow"
              >
                <div>
                  <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-accent/20 text-accent shadow-glow">
                    <Layers className="h-6 w-6" />
                  </div>
                  <h3 className="truncate text-lg font-bold">{mod.name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    {subjectCount} subject{subjectCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between text-sm font-semibold text-primary">
                  <span>Open</span>
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border/60 bg-background/30 p-12 text-center">
      <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
        <Layers className="h-7 w-7" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
